// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

/**
 * A utility script to run tests.
 *
 * Usage: deno run -A test.ts <test-spec>... [-- <test-arg>...]
 *
 * <test-spec>:
 *    test directory name or a file name, relative to the `tests` directory.
 *    These paths specifies which tests to run.
 *    An empty list will run all the tests.
 *
 * <test-arg>:
 *    arguments to path to the `deno test` command.
 *
 * Example:
 *   $ deno run -A test.ts policies prisma/one_to_many_test.ts -- -q
 *    > run all the tests under tests/policies and the test file tests/prisma/one_to_many_test.ts,
 * with the -q flag.
 */

import {
  basename,
  ctrlc,
  cyan,
  expandGlobSync,
  Fuse,
  gray,
  green,
  join,
  parseFlags,
  red,
  resolve,
  TextLineStream,
  yellow,
} from "./deps.ts";
import { projectDir } from "./utils.ts";

const flags = parseFlags(Deno.args, {
  "--": true,
  string: ["threads", "f", "filter"],
});

const testFiles: string[] = [];

// find test files
if (flags._.length === 0) {
  // run all the tests
  for (
    const entry of expandGlobSync("typegate/tests/**/*_test.ts", {
      root: projectDir,
      globstar: true,
    })
  ) {
    testFiles.push(entry.path);
  }
} else {
  for (const f of flags._) {
    const path = resolve(projectDir, "typegate/tests", f as string);
    const stat = await Deno.stat(path);

    if (stat.isDirectory) {
      for (
        const entry of expandGlobSync("**/*_test.ts", {
          root: path,
          globstar: true,
        })
      ) {
        testFiles.push(entry.path);
      }
      continue;
    }
    if (!stat.isFile) {
      throw new Error(`Not a file: ${path}`);
    }
    if (basename(path).match(/_test\.ts$/) != null) {
      testFiles.push(path);
    } else {
      throw new Error(`Not a valid test file: ${path}`);
    }
  }
}

const filter: string | undefined = flags.filter || flags.f;
const pathPrefix = `${projectDir}/typegate/tests/`;
const fuse = new Fuse(testFiles.map((f) => f.slice(pathPrefix.length)), {
  includeScore: true,
  useExtendedSearch: true,
  threshold: 0.4,
});
const filtered = filter ? fuse.search(filter) : null;
const filteredTestFiles = filter
  ? filtered!.map((res) => testFiles[res.refIndex])
  : testFiles;

const cwd = resolve(projectDir, "typegate");
const tmpDir = join(projectDir, "tmp");
const env: Record<string, string> = {
  "RUST_LOG": "off,xtask=debug,meta=debug",
  "LOG_LEVEL": "DEBUG",
  // "NO_COLOR": "1",
  "DEBUG": "true",
  "PACKAGED": "false",
  "TG_SECRET":
    "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==",
  "TG_ADMIN_PASSWORD": "password",
  "DENO_TESTING": "true",
  "TMP_DIR": tmpDir,
  "TIMER_MAX_TIMEOUT_MS": "30000",
  "NPM_CONFIG_REGISTRY": "http://localhost:4873",
};

await Deno.mkdir(tmpDir, { recursive: true });
// remove non-vendored caches
for await (const cache of Deno.readDir(tmpDir)) {
  if (
    cache.name.endsWith(".wasm") || cache.name == "libpython"
  ) {
    continue;
  }
  await Deno.remove(join(tmpDir, cache.name), { recursive: true });
}

const libPath = Deno.build.os === "darwin"
  ? "DYLD_LIBRARY_PATH"
  : "LD_LIBRARY_PATH";
const wasmEdgeLib = join(Deno.env.get("HOME")!, "/.wasmedge/lib");

if (!Deno.env.get(libPath)?.includes(wasmEdgeLib)) {
  env[libPath] = `${wasmEdgeLib}:${Deno.env.get(libPath) ?? ""}`;
}

const threads = flags.threads ? parseInt(flags.threads) : 4;
const prefix = "[dev/test.ts]";
console.log(`${prefix} Testing with ${threads} threads`);

type TestThreadState =
  | { status: "idle" }
  | { status: "running"; testFile: string }
  | { status: "finished" };

class Logger {
  private threadStates: Array<TestThreadState>;
  public testCommandOutputOptions: {
    stdout: "piped" | "inherit";
    stderr: "piped" | "inherit";
  };

  constructor(
    private threadCount: number,
    public readonly options: Readonly<OutputOptions>,
  ) {
    this.threadStates = Array.from({ length: threadCount }, () => ({
      status: "idle",
    }));
    this.testCommandOutputOptions = {
      stdout: options.stream ? "inherit" : "piped",
      stderr: options.stream ? "inherit" : "piped",
    };
  }

  threadState(threadId: number, state: TestThreadState) {
    this.threadStates[threadId - 1] = state;
    let displayedState: string;
    switch (state.status) {
      case "idle":
      case "finished":
        displayedState = gray(state.status);
        break;
      case "running":
        displayedState = state.testFile;
        break;
    }
    console.error(cyan(`thread #${threadId}`), displayedState);
  }

  result(result: TestResult) {
    let status: string;
    switch (result.status) {
      case "success":
        status = green("passed");
        break;
      case "failure":
        status = red("failed");
        break;
      case "error":
        status = red("error");
        break;
    }

    if (this.options.stream) {
      console.log();
    }
    console.log(
      status,
      result.testFile,
      gray(`(${result.duration}ms)`),
      gray(`#${result.runnerId}`),
    );
    if (this.options.stream) {
      console.log();
    }
  }

  resultOutputs(results: TestResult[]) {
    if (this.options.stream) return;
    for (const result of results) {
      if (result.status === "success" && !this.options.verbose) continue;
      this.#resultOuput(result);
    }
  }

  #resultOuput(result: TestResult) {
    console.error();
    console.error(
      gray("-- OUTPUT START <stdout>"),
      result.testFile,
      gray("--"),
    );
    console.error(result.stdout);
    console.error(gray("-- OUTPUT END <stdout>"), result.testFile, gray("--"));
    console.error();
    console.error(
      gray("-- OUTPUT START <stderr>"),
      result.testFile,
      gray("--"),
    );
    console.error(result.stderr);
    console.error(gray("-- OUTPUT END <stderr>"), result.testFile, gray("--"));
  }

  cancelled(count: number) {
    console.error(
      yellow(`cancelled ${count} pending tests...`),
      "Press Ctrl-C again to stop current tests...",
    );
  }
}

interface TestResult {
  testFile: string;
  duration: number;
  runnerId: number;
  status: "success" | "failure" | "error";
  stdout: string;
  stderr: string;
}

interface OutputOptions {
  stream: boolean;
  verbose: boolean;
}

class TestResultConsumer {
  private results: TestResult[] = [];
  private successCount = 0;
  private failureCount = 0;
  private cancelledCount = 0;
  private startTime: number;

  constructor(private logger: Logger) {
    this.startTime = Date.now();
  }

  consume(r: Omit<TestResult, "runnerId">, runner: TestThread) {
    const result: TestResult = { ...r, runnerId: runner.threadId };
    this.logger.result(result);
    if (result.status === "success") {
      this.successCount++;
    } else {
      this.failureCount++;
    }
    this.results.push(result);
  }

  setCancelledCount(count: number) {
    this.cancelledCount = count;
  }

  finalize(): number {
    this.logger.resultOutputs(this.results);

    const duration = Date.now() - this.startTime;

    console.log();
    if (this.cancelledCount > 0) {
      console.log(`${this.cancelledCount} tests were cancelled`);
    }
    console.log(`${this.results.length} tests completed in ${duration}ms:`);
    console.log(
      `  successes: ${this.successCount}/${this.results.length}`,
    );
    console.log(
      `  failures: ${this.failureCount}/${this.results.length}`,
    );

    if (this.failureCount > 0) {
      return 1;
    } else {
      return 0;
    }
  }
}

class TestThread {
  testProcess: Deno.ChildProcess | null = null;

  constructor(
    public threadId: number,
    private queue: string[],
    private results: TestResultConsumer,
    private logger: Logger,
  ) {}

  async run() {
    while (true) {
      const testFile = this.queue.shift();
      if (!testFile) break;

      const relativePath = testFile.slice(pathPrefix.length);

      this.logger.threadState(this.threadId, {
        status: "running",
        testFile: relativePath,
      });

      const start = Date.now();
      this.testProcess = new Deno.Command("deno", {
        args: [
          "task",
          "test",
          testFile,
          ...flags["--"],
        ],
        cwd,
        env: { ...Deno.env.toObject(), ...env },
        ...this.logger.testCommandOutputOptions,
      }).spawn();

      let streams: {
        stdout: ReadableStream<string>;
        stderr: ReadableStream<string>;
      } | null = null;

      if (!this.logger.options.stream) {
        streams = {
          stdout: this.testProcess.stdout.pipeThrough(new TextDecoderStream())
            .pipeThrough(new TextLineStream()),
          stderr: this.testProcess.stderr.pipeThrough(new TextDecoderStream())
            .pipeThrough(new TextLineStream()),
        };
      }

      let status: Deno.CommandStatus | null = null;
      try {
        status = await this.testProcess.status;
      } catch (error) {
        console.error(error);
      }

      const duration = Date.now() - start;

      let stdout = "";
      let stderr = "";
      try {
        if (streams) {
          for await (const line of streams.stdout) {
            stdout += line + "\n";
          }
          for await (const line of streams.stderr) {
            stderr += line + "\n";
          }
        }
      } catch (error) {
        console.error(error);
      }

      const statusString = status == null
        ? "error"
        : (status.success ? "success" : "failure");

      this.results.consume({
        testFile: relativePath,
        duration,
        status: statusString,
        stdout,
        stderr,
      }, this);
    }

    this.logger.threadState(this.threadId, { status: "finished" });
  }
}

const queues = [...filteredTestFiles];
const outputOptions: OutputOptions = {
  stream: threads === 1 || queues.length === 1,
  verbose: false,
};

console.log(`Discovered ${queues.length} test files`);

const logger = new Logger(threads, outputOptions);
const results = new TestResultConsumer(logger);

const testThreads: TestThread[] = [];
for (let i = 0; i < threads; i++) {
  testThreads.push(new TestThread(i + 1, queues, results, logger));
}

let ctrlcCount = 0;
const _ctrlc = ctrlc.setHandler(() => {
  ctrlcCount++;
  switch (ctrlcCount) {
    case 1: {
      const remaining = queues.length;
      queues.length = 0;
      logger.cancelled(remaining);
      results.setCancelledCount(remaining);
      break;
    }

    case 2: {
      console.log(`Killing ${testThreads.length} running tests...`);
      for (const t of testThreads) {
        if (t.testProcess) {
          t.testProcess.kill("SIGKILL");
        }
      }
      break;
    }

    case 3:
      console.log("Force exiting...");
      Deno.exit(1);
      break;
  }
});

const runnerResults = await Promise.allSettled(testThreads.map(async (t) => {
  await t.run();
  return t;
}));
for (const result of runnerResults) {
  if (result.status === "rejected") {
    console.error("Thread #${result.threadId} failed to run");
    console.error(result.reason);
  }
}

Deno.exit(results.finalize());
