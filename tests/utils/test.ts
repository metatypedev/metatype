// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SystemTypegraph } from "@metatype/typegate/system_typegraphs.ts";
import { basename, dirname, extname, join } from "@std/path";
import { newTempDir, testDir } from "./dir.ts";
import { shell, ShellOptions } from "./shell.ts";
import { assertSnapshot } from "@std/testing/snapshot";
import { type SnapshotOptions } from "@std/testing/snapshot";
import { assertEquals, assertNotEquals } from "@std/assert";
import { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";
import { Typegate } from "@metatype/typegate/typegate/mod.ts";
import { createMetaCli } from "./meta.ts";
import { TypeGraph } from "@metatype/typegate/typegraph/mod.ts";
import {
  defaultTypegateConfigBase,
  getTypegateConfig,
  SyncConfig,
} from "@metatype/typegate/config.ts";
// until deno supports it...
import { AsyncDisposableStack } from "dispose";
import { Typegraph } from "@metatype/typegate/typegraph/types.ts";
import { ArtifactUploader } from "@typegraph/sdk/tg_artifact_upload.ts";
import { BasicAuth } from "@typegraph/sdk/tg_deploy.ts";
import { exists } from "@std/fs/exists";
import { metaCli } from "test-utils/meta.ts";
import { $ } from "@david/dax";

export interface ParseOptions {
  deploy?: boolean;
  cwd?: string;
  typegraph?: string;
  secrets?: Record<string, string>;
  autoSecretName?: boolean;
  prefix?: string;
  pretty?: boolean;
}

export enum SDKLangugage {
  Python = "python3",
  TypeScript = "deno",
}

// with a round-robin load balancer emulation
class TypegateManager implements AsyncDisposable {
  private index = 0;

  constructor(public typegates: Typegate[]) {}

  get replicas() {
    return this.typegates.length;
  }

  next() {
    const typegate = this.typegates[this.index];
    this.index = (this.index + 1) % this.typegates.length;
    return typegate;
  }

  async [Symbol.asyncDispose]() {
    await Promise.all(
      this.typegates.map(async (tg) => {
        await tg[Symbol.asyncDispose]();
      }),
    );
  }
}

interface ServeResult extends AsyncDisposable {
  port: number;
}

function serve(typegates: TypegateManager): Promise<ServeResult> {
  return new Promise((resolve) => {
    const server = Deno.serve(
      {
        port: 0,
        onListen: ({ port }) => {
          resolve({
            port,
            async [Symbol.asyncDispose]() {
              await server.shutdown();
            },
          });
        },
      },
      (req) => {
        return typegates.next().handle(req, {
          hostname: "localhost",
          port: 0,
          transport: "tcp",
        });
      },
    );
  });
}

export type MetaTestCleanupFn = () => unknown | Promise<unknown>;

const defaultCli = await createMetaCli(shell);

export class MetaTest {
  shell = shell;
  meta = defaultCli;
  workingDir = testDir;
  currentTypegateIndex = 0;
  #disposed = false;

  static async init(
    t: Deno.TestContext,
    typegates: TypegateManager,
    introspection: boolean,
  ): Promise<MetaTest> {
    await using stack = new AsyncDisposableStack();
    stack.use(typegates);

    const server = await serve(typegates);
    const portNumber = server.port;
    stack.use(server);

    const mt = new MetaTest(
      t,
      typegates,
      introspection,
      portNumber,
      stack.move(),
    );

    return mt;
  }

  private constructor(
    public t: Deno.TestContext,
    public typegates: TypegateManager,
    private introspection: boolean,
    public port: number,
    public disposables: AsyncDisposableStack,
  ) {}

  async [Symbol.asyncDispose]() {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.disposables[Symbol.asyncDispose]();
  }

  addCleanup(fn: MetaTestCleanupFn) {
    this.disposables.defer(async () => {
      await fn();
    });
  }

  get typegate() {
    return this.typegates.next();
  }

  get tempDir() {
    return this.typegate.config.base.tmp_dir;
  }

  getTypegraphEngine(name: string): QueryEngine | undefined {
    const register = this.typegates.next().register;
    return register.get(name);
  }

  async serialize(path: string, opts: ParseOptions = {}): Promise<string> {
    const {
      deploy = false,
      typegraph = null,
      prefix = null,
      pretty = false,
    } = opts;
    const cmd = ["serialize", "-f", path];

    if (pretty) {
      cmd.push("--pretty");
    }

    if (prefix != null) {
      cmd.push("--prefix", prefix);
    }

    if (typegraph == null) {
      cmd.push("-1");
    } else {
      cmd.push("--typegraph", typegraph);
    }

    if (deploy) {
      cmd.push("--deploy");
    }

    const { stdout } = await this.meta(cmd);
    if (stdout.length == 0) {
      throw new Error("No typegraph");
    }

    return stdout;
  }

  async undeploy(tgName: string) {
    await this.typegates.next().removeTypegraph(tgName);
  }

  async #engineFromTypegraph(
    tg: Typegraph,
    secrets: Record<string, string>,
  ): Promise<QueryEngine> {
    const { engine, response } = await this.typegate.pushTypegraph(
      tg,
      secrets,
      this.introspection,
    );

    if (engine == null) {
      throw response.failure!;
    }

    this.addCleanup(() => engine[Symbol.asyncDispose]());
    return engine;
  }

  async engine(path: string, opts: ParseOptions = {}) {
    console.log("t.engine", this.port, opts);
    const secrets = opts.secrets ?? {};
    const optSecrets = Object.entries(secrets).map(([name, value]) => {
      return `--secret=${name}=${value}`;
    });
    const { stdout } = await metaCli(
      "deploy",
      "--target=dev",
      `--gate=http://localhost:${this.port}`,
      "--allow-dirty",
      "--create-migration",
      ...optSecrets,
      `--file=${path}`,
    );
    console.log({ stdout: $.stripAnsi(stdout) });
    const matches = stdout.match(/\((.*)\)/);
    const typegraphs = matches?.[1].split(", ") ?? [];
    if (typegraphs.length == 0) {
      throw new Error("No typegraph");
    }
    if (typegraphs.length > 1) {
      throw new Error("Multiple typegraphs");
    }
    const tgName = opts.typegraph ?? typegraphs[0];
    const engine = this.typegate.register.get(tgName)!;

    if (!engine) {
      throw new Error(`Typegate engine '${tgName}' not found`);
    }

    return engine;
  }

  async unregister(engine: QueryEngine) {
    const typegate = this.typegates.next();
    await Promise.all(
      typegate.register
        .list()
        .filter((e) => e == engine)
        .map((e) => {
          typegate.register.remove(e.name);
          return e[Symbol.asyncDispose]();
        }),
    );
  }

  async should(
    fact: string,
    fn: (t: Deno.TestContext) => void | Promise<void>,
  ): Promise<boolean> {
    const res = await this.t.step({
      name: `should ${fact}`,
      fn: async (t) => {
        try {
          await fn(t);
        } catch (e) {
          console.error(e);
          throw e;
        }
      },
    });
    if (!res) {
      console.error(`step ${fact} failed unexpectedly`);
    }

    return true;
  }

  async assertSnapshot(
    value: unknown,
    options: SnapshotOptions = {},
  ): Promise<void> {
    await assertSnapshot(this.t, value, options);
  }

  async assertThrowsSnapshot(
    fn: () => void,
    options: SnapshotOptions = {},
  ): Promise<void> {
    try {
      fn();
    } catch (e) {
      return await this.assertSnapshot(e.message, options);
    }
    throw new Error("Assertion failure: function did not throw");
  }

  async assertSameTypegraphs(...paths: string[]) {
    assertNotEquals(paths.length, 0);
    const first = paths.shift()!;
    const expected = await this.serialize(first, { pretty: true });
    await this.assertSnapshot(expected);
    for (const path of paths) {
      await this.should(
        `serialize ${path} to the same typegraph as ${first}`,
        async () => {
          const actual = await this.serialize(path, { pretty: true });
          assertEquals(actual, expected);
        },
      );
    }
  }
}

function extractJsonFromStdout(stdout: string): string | null {
  let jsonStart = null;
  let inJson = false;

  for (const line of stdout.split("\n")) {
    if (inJson) {
      jsonStart += "\n" + line;
    } else if (line.startsWith("{")) {
      jsonStart = line;
      inJson = true;
    }
  }

  return jsonStart;
}

interface TempGitRepo {
  content: Record<string, string>;
}

interface TestConfig {
  introspection?: boolean;
  // number of typegate instances to create
  replicas?: number;
  // create a temporary clean git repo for the tests
  gitRepo?: TempGitRepo;
  syncConfig?: SyncConfig;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

interface Test {
  (
    opts: string | (Omit<Deno.TestDefinition, "fn"> & TestConfig),
    fn: (t: MetaTest) => void | Promise<void>,
  ): void;
}

interface TestExt extends Test {
  only: Test;
  ignore: Test;
}

let currentTest: MetaTest | null = null;
export function getCurrentTest(): MetaTest {
  if (currentTest == null) {
    throw new Error("No current test");
  }
  return currentTest;
}

export const test = ((o, fn): void => {
  const opts = typeof o === "string" ? { name: o } : o;
  return Deno.test({
    async fn(t) {
      if (opts.setup != null) {
        await opts.setup();
      }
      const replicas = opts.replicas ?? 1;
      if (replicas < 1) {
        throw new Error("replicas must be greater than 0");
      }
      if (replicas > 1 && opts.syncConfig == null) {
        throw new Error(
          "syncConfig must be provided when using multiple typegate instances",
        );
      }

      const tempDirs = await Promise.all(
        Array.from({ length: replicas }).map(async (_) => {
          const uuid = crypto.randomUUID();
          return await newTempDir({
            prefix: `typegate-test-${uuid}`,
          });
        }),
      );

      // TODO different tempDir for each typegate instance
      const result = await Promise.allSettled(
        Array.from({ length: replicas }).map(async (_, index) => {
          const config = getTypegateConfig({
            base: {
              ...defaultTypegateConfigBase,
            },
          });
          config.sync = opts.syncConfig ?? null;
          config.base.tmp_dir = tempDirs[index];
          return await Typegate.init(config);
        }),
      );
      const typegates = result.map((r) => {
        if (r.status === "fulfilled") {
          return r.value;
        } else {
          throw r.reason;
        }
      });

      const { gitRepo = null, introspection = false } = opts;
      await Promise.all(
        typegates.map((typegate) => SystemTypegraph.loadAll(typegate)),
      );

      await using mt = await MetaTest.init(
        t,
        new TypegateManager(typegates),
        introspection,
      );

      mt.disposables.defer(async () => {
        await Promise.all(
          tempDirs.map(async (tempDir, _) => {
            await Deno.remove(tempDir, { recursive: true });
          }),
        );
      });

      if (opts.teardown != null) {
        mt.disposables.defer(opts.teardown);
      }

      try {
        if (gitRepo != null) {
          const dir = await newTempDir();
          mt.workingDir = dir;

          for (const [path, srcPath] of Object.entries(gitRepo.content)) {
            const destPath = join(dir, path);
            await Deno.mkdir(dirname(destPath), { recursive: true });
            await Deno.copyFile(join(testDir, srcPath), destPath);
          }

          const sh = (args: string[], options?: ShellOptions) => {
            return shell(args, { currentDir: dir!, ...options });
          };

          mt.shell = sh;
          mt.meta = await createMetaCli(sh);
          await sh(["git", "init"]);
          await sh(["git", "config", "user.name", "user"]);
          await sh(["git", "config", "user.email", "user@example.com"]);
          await sh(["git", "add", "."]);
          await sh(["git", "commit", "-m", "Initial commit"]);
        }

        currentTest = mt;
        await fn(mt);
        currentTest = null;
      } catch (error) {
        throw error;
      }
    },
    ...opts,
  });
}) as TestExt;

test.only = (o, fn) =>
  test({ ...(typeof o === "string" ? { name: o } : o), only: true }, fn);

test.ignore = (o, fn) =>
  test({ ...(typeof o === "string" ? { name: o } : o), ignore: true }, fn);
