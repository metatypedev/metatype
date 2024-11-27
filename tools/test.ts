#!/bin/env -S ghjk deno run -A

// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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

import type { CommandChild } from "@david/dax";
import {
  $,
  ctrlc,
  cyan,
  Fuse,
  gray,
  green,
  mergeReadableStreams,
  parseArgs,
  red,
  TextLineStream,
  yellow,
} from "./deps.ts";
import { projectDir } from "./utils.ts";

const wd = $.path(projectDir);

const profile = "debug";

async function listTestFiles(filesArg: string[]): Promise<string[]> {
  if (filesArg.length > 0) {
    const testFiles = [] as string[];
    await $.co(
      filesArg.map(async (inPath) => {
        let path = wd.resolve(inPath);
        let stat = await path.stat();
        if (!stat) {
          path = wd.resolve("tests", inPath);
          stat = await path.stat();
          if (!stat) {
            throw new Error(`unable to resolve test files under "${inPath}"`);
          }
        }
        if (stat.isDirectory) {
          testFiles.push(
            ...(
              await Array.fromAsync(
                path.expandGlob("**/*_test.ts", { globstar: true }),
              )
            ).map((ent) => ent.path.toString()),
          );
          return;
        }
        if (!stat.isFile) {
          throw new Error(`Not a file: ${path}`);
        }
        if (path.basename().match(/_test\.ts$/) != null) {
          testFiles.push(path.resolve().toString());
        } else {
          throw new Error(`Not a valid test file: ${path}`);
        }
      }),
    );
    return testFiles;
  } else {
    // run all the tests
    return (
      await Array.fromAsync(
        wd.join("tests").expandGlob("**/*_test.ts", { globstar: true }),
      )
    ).map((ent) => ent.path.toString());
  }
}

interface Result {
  testFile: string;
  duration: number;
  success: boolean;
}

interface Run {
  promise: Promise<Result>;
  output: ReadableStream<string> | null;
  done: boolean;
  child: CommandChild;
}

function applyFilter(files: string[], filter: string | undefined): string[] {
  const prefixLength = `${projectDir}/tests/`.length;
  const fuse = new Fuse(
    files.map((f) => f.slice(prefixLength)),
    {
      includeScore: true,
      useExtendedSearch: true,
      threshold: 0.4,
    },
  );
  const filtered = filter ? fuse.search(filter) : null;
  return filtered?.map((res) => files[res.refIndex]) ?? files;
}

export async function testE2e(args: {
  files: string[];
  filter?: string;
  threads?: number;
  flags?: string[];
}) {
  const { filter, threads = 4, flags = [] } = args;
  const testFiles = await listTestFiles(args.files);
  const filteredTestFiles = applyFilter(testFiles, filter);
  if (filteredTestFiles.length == 0) {
    throw new Error("No tests found to run");
  }

  const tmpDir = wd.join("tmp");
  const env: Record<string, string> = {
    CLICOLOR_FORCE: "1",
    // RUST_LOG: "trace",
    RUST_LOG:
      "info,xtask=debug,meta=debug,deno=warn,swc_ecma_codegen=off,tracing::span=off,typegate=trace",
    RUST_SPANTRACE: "1",
    // "RUST_BACKTRACE": "short",
    RUST_MIN_STACK: "8388608",
    LOG_LEVEL: "DEBUG,substantial=DEBUG",
    // "NO_COLOR": "1",
    DEBUG: "true",
    PACKAGED: "false",
    TG_SECRET:
      "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==",
    TG_ADMIN_PASSWORD: "password",
    DENO_TESTING: "true",
    TMP_DIR: tmpDir.toString(),
    TIMER_MAX_TIMEOUT_MS: "30000",
    // NOTE: ordering of the variables is important as we want the
    // `meta` build to be resolved before any system meta builds
    PATH: `${wd.join(`target/${profile}`).toString()}:${Deno.env.get("PATH")}`,
  };

  if (await wd.join(".venv").exists()) {
    env["PATH"] = `${wd.join(".venv/bin").toString()}:${env["PATH"]}`;
  }

  await tmpDir.ensureDir();
  // remove non-vendored caches
  for await (const cache of tmpDir.readDir()) {
    if (
      cache.name.endsWith(".wasm") ||
      cache.name == "libpython" ||
      cache.name.startsWith("meta-cli")
    ) {
      continue;
    }
    await tmpDir.join(cache.name).remove({ recursive: true });
  }

  const prefix = "[dev/test.ts]";
  $.logStep(`${prefix} Testing with ${threads} threads`);

  const xtask = wd.join(`target/${profile}/xtask`);
  const denoConfig = wd.join("tests/deno.jsonc");

  function createRun(testFile: string, streamed: boolean): Run {
    const start = Date.now();
    const outputOption = streamed ? "inherit" : "piped";
    const child = $
      .raw`${xtask} deno test --config=${denoConfig} ${testFile} ${flags}`
      // .raw`bash -c 'deno test -A --config=${denoConfig} ${testFile} ${flags}'`
      .cwd(wd)
      .env(env)
      .stdout(outputOption)
      .stderr(outputOption)
      .noThrow()
      .spawn();

    const output = streamed
      ? null
      : mergeReadableStreams(child.stdout(), child.stderr())
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream());

    const promise = child.then(({ code }) => {
      const end = Date.now();
      return { success: code == 0, testFile, duration: end - start };
    });

    return {
      promise,
      output,
      done: false,
      child,
    };
  }

  const queue = [...filteredTestFiles];

  const buildProfile = profile == "debug" ? "dev" : profile;

  $.logStep(`${prefix} Building xtask and meta-cli...`);
  await $`cargo build -p meta-cli -F typegate --profile ${buildProfile}
          && mv target/${profile}/meta target/${profile}/meta-full
          && cargo build -p xtask -p meta-cli --profile ${buildProfile}`.cwd(
    wd,
  );

  $.logStep(`Discovered ${queue.length} test files to run`);

  const threadCount = Math.min(threads, queue.length);

  const outputOptions: OutputOptions = {
    streamed: threadCount === 1,
    verbose: false,
  };
  const logger = new Logger(queue, threadCount, outputOptions);
  const results = new TestResultConsumer(logger);

  const testThreads: TestThread[] = [];
  for (let i = 0; i < threadCount; i++) {
    testThreads.push(new TestThread(i + 1, queue, results, logger, createRun));
  }

  let ctrlcCount = 0;
  const _ctrlc = ctrlc.setHandler(() => {
    ctrlcCount++;
    switch (ctrlcCount) {
      case 1: {
        const remaining = queue.length;
        queue.length = 0;
        logger.cancelled(remaining);
        results.setCancelledCount(remaining);
        break;
      }

      case 2: {
        console.log(`Killing ${testThreads.length} running tests...`);
        for (const t of testThreads) {
          if (t.currentRun) {
            t.currentRun.child.kill("SIGKILL");
          }
        }
        break;
      }

      case 3:
        console.log("Force exiting...");
        Deno.exit(1);
    }
  });

  const runnerResults = await Promise.allSettled(
    testThreads.map(async (t) => {
      await t.run();
      return t;
    }),
  );
  for (const result of runnerResults) {
    if (result.status === "rejected") {
      console.error("Thread #${result.threadId} failed to run");
      console.error(result.reason);
    }
  }

  return await results.finalize();
}

export async function testE2eCli(argv: string[]) {
  const flags = parseArgs(argv, {
    "--": true,
    string: ["threads", "f", "filter"],
  });
  return await testE2e({
    files: flags._.map((item) => item.toString()),
    threads: flags.threads ? parseInt(flags.threads) : undefined,
    filter: flags.filter ?? flags.f,
    flags: flags["--"],
  });
}

if (import.meta.main) {
  Deno.exit(await testE2eCli(Deno.args));
}

type TestThreadState =
  | { status: "idle" }
  | { status: "running"; testFile: string }
  | { status: "finished" };

interface Counts {
  success: number;
  failure: number;
  cancelled: number;
}

class Logger {
  private threadStates: Array<TestThreadState>;
  private dynamic = Deno.stdout.isTerminal(); // TODO: make this configurable

  #print(...args: unknown[]) {
    Deno.stdout.writeSync(new TextEncoder().encode(args.join(" ")));
  }
  #println(...args: unknown[]) {
    this.#print(...args, "\n");
  }

  #counts: Counts = {
    success: 0,
    failure: 0,
    cancelled: 0,
  };

  constructor(
    private queue: string[],
    private threadCount: number,
    public readonly options: Readonly<OutputOptions>,
  ) {
    this.threadStates = Array.from({ length: threadCount }, () => ({
      status: "idle",
    }));

    if (this.dynamic) {
      this.#println();
      this.#displayThreadStates();
    }
  }

  threadState(threadId: number, state: TestThreadState) {
    this.threadStates[threadId - 1] = state;
    if (!this.dynamic) {
      this.#displayThreadState(threadId);
    } else {
      this.#clearThreadStates();
      this.#displayThreadStates();
    }
  }

  updateCounts(counts: Partial<Counts>) {
    this.#counts = {
      ...this.#counts,
      ...counts,
    };
  }

  #clearThreadStates() {
    this.#print(`\x1b[${this.threadCount + 2}A\x1b[J`);
  }
  #displayThreadStates() {
    this.#println();
    for (let i = 1; i <= this.threadCount; i++) {
      this.#displayThreadState(i);
    }
    this.#displayCounts();
  }

  #displayCounts() {
    const fields = [];

    const activeCount = this.threadStates.filter(
      (s) => s.status === "running",
    ).length;
    fields.push(gray(`active=${activeCount}`));

    fields.push(`pending=${this.queue.length}`);

    if (this.#counts.success) {
      fields.push(green(`success=${this.#counts.success}`));
    }

    if (this.#counts.failure) {
      fields.push(red(`failure=${this.#counts.failure}`));
    }

    if (this.#counts.cancelled) {
      fields.push(gray(`cancelled=${this.#counts.cancelled}`));
    }

    this.#println(" ", ...fields);
  }

  #displayThreadState(threadId: number) {
    const state = this.threadStates[threadId - 1];
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
    this.#println(cyan(`thread #${threadId}`), displayedState);
  }

  result(result: ExtendedResult, counts: Counts) {
    this.updateCounts(counts);
    const status = result.success ? green("passed") : red("failed");

    this.#output(() => {
      this.#println(
        status,
        result.testFile,
        gray(`(${result.duration / 1_000}s)`),
        gray(`#${result.runnerId}`),
      );
    });
  }

  async resultOutputs(results: ExtendedResult[]) {
    if (this.options.streamed) return;
    for (const result of results) {
      if (result.success && !this.options.verbose) continue;
      await this.#resultOuput(result);
    }
  }

  async #resultOuput(result: ExtendedResult) {
    this.#println();
    this.#println(gray("-- OUTPUT START"), result.testFile, gray("--"));
    for await (const line of result.output!) {
      this.#println(line);
    }
    this.#println(gray("-- OUTPUT END"), result.testFile, gray("--"));
  }

  cancelled(count: number) {
    this.#output(() => {
      this.#println(
        yellow(`cancelled ${count} pending tests...`),
        "Press Ctrl-C again to stop current tests...",
      );
    });
  }

  #output(outputFn: () => void) {
    if (!this.dynamic) {
      if (this.options.streamed) {
        this.#println();
      }
      outputFn();
      if (this.options.streamed) {
        this.#println();
      }
    } else {
      this.#clearThreadStates();
      outputFn();
      this.#displayThreadStates();
    }
  }
}

interface ExtendedResult extends Result {
  testFile: string;
  output: ReadableStream<string> | null;
  runnerId: number;
}

interface OutputOptions {
  streamed: boolean;
  verbose: boolean;
}

class TestResultConsumer {
  private results: ExtendedResult[] = [];
  #counts: Counts = {
    success: 0,
    failure: 0,
    // error: 0,
    cancelled: 0,
  };
  private startTime: number;

  constructor(private logger: Logger) {
    this.startTime = Date.now();
  }

  consume(r: Omit<ExtendedResult, "runnerId">, runner: TestThread) {
    const result: ExtendedResult = { ...r, runnerId: runner.threadId };
    if (result.success) {
      this.#counts.success++;
    } else {
      this.#counts.failure++;
    }

    this.logger.result(result, this.#counts);
    this.results.push(result);
  }

  setCancelledCount(count: number) {
    this.#counts.cancelled = count;
  }

  async finalize(): Promise<number> {
    await this.logger.resultOutputs(this.results);

    const duration = Date.now() - this.startTime;

    console.log();
    if (this.#counts.cancelled > 0) {
      console.log(`${this.#counts.cancelled} tests were cancelled`);
    }
    console.log(
      `${this.results.length} tests completed in ${
        Math.floor(
          duration / 60_000,
        )
      }m${Math.floor(duration / 1_000)}s:`,
    );
    console.log(`  successes: ${this.#counts.success}/${this.results.length}`);

    console.log(`  failures: ${this.#counts.failure}/${this.results.length}`);

    if (this.#counts.failure > 0) {
      for (const res of this.results) {
        if (!res.success) {
          console.log(`    - ${res.testFile}`);
        }
      }
    }

    if (this.#counts.failure + this.#counts.cancelled > 0) {
      return 1;
    } else {
      return 0;
    }
  }
}

class TestThread {
  currentRun: Run | null = null;

  constructor(
    public threadId: number,
    private queue: string[],
    private results: TestResultConsumer,
    private logger: Logger,
    private createRun: (file: string, streamed: boolean) => Run,
  ) {}

  async run() {
    while (true) {
      const testFile = this.queue.shift();
      if (!testFile) break;

      const pathPrefix = `${projectDir}/tests/`;
      const relativePath = testFile.slice(pathPrefix.length);

      this.logger.threadState(this.threadId, {
        status: "running",
        testFile: relativePath,
      });

      this.currentRun = this.createRun(testFile, this.logger.options.streamed);
      const result = await this.currentRun.promise;

      this.results.consume(
        {
          output: this.currentRun.output,
          ...result,
          testFile: relativePath,
        },
        this,
      );
      this.currentRun = null;
    }

    this.logger.threadState(this.threadId, { status: "finished" });
  }
}
