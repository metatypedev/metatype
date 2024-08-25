// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "../../utils/mod.ts";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsCommand,
  S3Client,
} from "aws-sdk/client-s3";
import { TestModule } from "test-utils/test_module.ts";
import { testDir } from "test-utils/dir.ts";
import { join } from "std/path/join";
import { assertEquals } from "std/assert";
import { TextLineStream } from "std/streams;

const HOST = "http://localhost:9000";
const REGION = "local";
const ACCESS_KEY = "minio";
const SECRET_KEY = "password";
const PATH_STYLE = "true";

const m = new TestModule(import.meta);

async function initBucket() {
  const client = new S3Client({
    endpoint: "http://localhost:9000",
    region: "local",
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    forcePathStyle: true,
  });

  try {
    const command = new CreateBucketCommand({
      Bucket: "bucket",
    });
    await client.send(command);
  } catch (_e) {
    // bucket already exists
    const listCommand = new ListObjectsCommand({ Bucket: "bucket" });
    const res = await client.send(listCommand);

    if (res.Contents != null) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: "bucket",
        Delete: {
          Objects: res.Contents.map(({ Key }) => ({ Key })),
        },
      });
      await client.send(deleteCommand);
    }
  }
}

const apolloDir = join(testDir, "e2e", "nextjs", "apollo");

type Unsubscribe = () => void;
type LineConsumer = (line: string, unsub: Unsubscribe) => void;

type OutputChannel = {
  subscribers: LineConsumer[];
  cancellableReader: CancellableReader;
  stream: ReadableStream<string>;
};

type ReaderStatus = {
  cancelled: boolean;
};

class CancellableReader {
  public static POLL_INTERVAL = 100;
  // public static TIMEOUT = 5000;

  static init(
    stream: ReadableStream<string>,
    consumer: (line: string) => void,
  ) {
    const reader = stream.getReader();
    const status: ReaderStatus = { cancelled: false };
    const promise = (async () => {
      while (!status.cancelled) {
        const timerId = setInterval(() => {
          if (status.cancelled) {
            reader.cancel();
            clearInterval(timerId);
          }
        }, CancellableReader.POLL_INTERVAL);
        const { done, value } = await reader.read();
        clearInterval(timerId);
        if (done) {
          break;
        }
        consumer(value);
      }

      reader.releaseLock();
    })();

    return new CancellableReader(status, promise);
  }

  private constructor(
    private status: ReaderStatus,
    private promise: Promise<void>,
  ) {}

  async cancel() {
    this.status.cancelled = true;
    await this.promise;
  }
}

class NextJsServer {
  private constructor(
    public process: Deno.ChildProcess,
    private stdout: OutputChannel,
    private stderr: OutputChannel,
  ) {}

  public static init(command: Deno.Command) {
    const process = command.spawn();

    const stdoutLineConsumers: LineConsumer[] = [];
    const stdoutLineStream = process.stdout
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    const stdoutCR = CancellableReader.init(stdoutLineStream, (line) => {
      console.log("[Nextjs:stdout]", line);
      stdoutLineConsumers.forEach((c) =>
        c(line, () => {
          stdoutLineConsumers.splice(stdoutLineConsumers.indexOf(c), 1);
        })
      );
    });

    const stderrLineConsumers: LineConsumer[] = [];
    const stderrLineStream = process.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());
    const stderrCR = CancellableReader.init(stderrLineStream, (line) => {
      console.log("[Nextjs:stderr]", line);
      stderrLineConsumers.forEach((c) =>
        c(line, () => {
          stderrLineConsumers.splice(stderrLineConsumers.indexOf(c), 1);
        })
      );
    });

    return new NextJsServer(
      process,
      {
        subscribers: stdoutLineConsumers,
        cancellableReader: stdoutCR,
        stream: stdoutLineStream,
      },
      {
        subscribers: stderrLineConsumers,
        cancellableReader: stderrCR,
        stream: stderrLineStream,
      },
    );
  }

  stdoutSubscribe(consumer: LineConsumer): Unsubscribe {
    return NextJsServer.subscribeOutput(this.stdout.subscribers, consumer);
  }

  stderrSubscribe(consumer: LineConsumer): Unsubscribe {
    return NextJsServer.subscribeOutput(this.stderr.subscribers, consumer);
  }

  private static subscribeOutput(
    consumers: LineConsumer[],
    consumer: LineConsumer,
  ): Unsubscribe {
    consumers.push(consumer);
    return () => {
      consumers.splice(consumers.indexOf(consumer, 1));
    };
  }

  async status() {
    // return this.process.status;
    const [_, __, s] = await Promise.all([
      this.stdout.cancellableReader.cancel(),
      this.stderr.cancellableReader.cancel(),
      this.process.status,
    ]);
    return s;
  }

  ready(): Promise<{ port: number }> {
    return new Promise((resolve, _reject) => {
      let port = 0;
      this.stdoutSubscribe((line, unsub) => {
        if (line.includes("- Local")) {
          const match = line.match(/http:\/\/localhost:(\d+)/);
          if (match) {
            port = parseInt(match[1]);
          }
        } else {
          if (line.includes("✓ Ready")) {
            if (port === 0) {
              console.error("Port not found");
            }
            unsub();
            resolve({ port });
          }
        }
      });
    });
  }

  stop(): Promise<Deno.CommandStatus> {
    this.process.kill("SIGKILL");
    return this.status();
  }
}

function startNextServer(typegatePort: number) {
  const command = new Deno.Command("pnpm", {
    args: ["run", "dev", "-p", `${0}`],
    cwd: apolloDir,
    env: {
      ...Deno.env.toObject(),
      TG_PORT: `${typegatePort}`,
    },
    stderr: "piped",
    stdout: "piped",
  });
  return NextJsServer.init(command);
}

const secrets = {
  HOST,
  REGION,
  access_key: ACCESS_KEY,
  secret_key: SECRET_KEY,
  PATH_STYLE,
};

async function deployTypegraph(port: number) {
  const output = await m.cli(
    {},
    "deploy",
    "--target=dev",
    `--gate=http://localhost:${port}`,
    "-f",
    "typegraph/apollo.py",
    "--allow-dirty",
    ...Object.entries(secrets).map(([k, v]) => `--secret=apollo:${k}=${v}`),
  );

  console.log("---- Start: Deploy output: stdout ----");
  console.log(output.stdout);
  console.log("---- End: Deploy output: stdout ----");
  console.log("---- Start: Deploy output: stderr ----");
  console.log(output.stderr);
  console.log("---- End: Deploy output: stderr ----");
}

async function undeployTypegraph(port: number) {
  await m.cli(
    {},
    "undeploy",
    "--target=dev",
    `--gate=http://localhost:${port}`,
    "--typegraph",
    "apollo",
  );
}

Meta.test(
  {
    name: "apollo client",
    introspection: true,
  },
  async (t) => {
    await initBucket();
    await deployTypegraph(t.port!);

    // install nextjs app
    const install = await t.shell(["pnpm", "install"], {
      currentDir: apolloDir,
    });
    console.log("Nextjs initialization", install);

    // start nextjs app
    const nextjs = startNextServer(t.port!);
    const { port: nextjsPort } = await nextjs.ready();
    console.log(`Nextjs server ready: listening on port ${nextjsPort}`);

    try {
      const url = `http://localhost:${nextjsPort}/api/apollo`;
      console.log("Fetch", url);
      const res = await fetch(url);
      const jsonResponse = await res.json();

      console.log("Nextjs API response", jsonResponse);
      assertEquals(jsonResponse, { success: { data: { uploadMany: true } } });
    } catch (err) {
      throw err;
    } finally {
      const status = await nextjs.stop();
      console.log("Nextjs server stopped", status);
    }

    await undeployTypegraph(t.port!);
  },
);
