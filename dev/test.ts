#!/bin/env -S ghjk deno run -A --config=typegate/deno.jsonc

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
  $,
  Fuse,
  mergeReadableStreams,
  parseArgs,
  TextLineStream,
} from "./deps.ts";
import { projectDir } from "./utils.ts";

export async function testE2e(args: {
  files: string[];
  filter?: string;
  threads?: number;
  flags?: string[];
}) {
  const { filter, threads = 4, flags = [] } = args;
  const wd = $.path(projectDir);
  const testFiles = [] as string[];
  if (args.files.length > 0) {
    await $.co(
      args.files.map(async (inPath) => {
        let path = wd.resolve(inPath);
        let stat = await path.stat();
        if (!stat) {
          path = wd.resolve("typegate/tests", inPath);
          stat = await path.stat();
          if (!stat) {
            throw new Error(`unable to resolve test files under "${inPath}"`);
          }
        }
        if (stat.isDirectory) {
          testFiles.push(
            ...(
              await Array.fromAsync(
                path.expandGlob("**/*_test.ts", { globstar: true })
              )
            ).map((ent) => ent.path.toString())
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
      })
    );
  } else {
    // run all the tests
    testFiles.push(
      ...(
        await Array.fromAsync(
          wd
            .join("typegate/tests")
            .expandGlob("**/*_test.ts", { globstar: true })
        )
      ).map((ent) => ent.path.toString())
    );
  }
  const prefixLength = `${projectDir}/typegate/tests/`.length;
  const fuse = new Fuse(
    testFiles.map((f) => f.slice(prefixLength)),
    {
      includeScore: true,
      useExtendedSearch: true,
      threshold: 0.4,
    }
  );
  const filtered = filter ? fuse.search(filter) : null;
  const filteredTestFiles =
    filtered?.map((res) => testFiles[res.refIndex]) ?? testFiles;

  if (filteredTestFiles.length == 0) {
    throw new Error("No tests found to run");
  }

  const tmpDir = wd.join("tmp");
  const env: Record<string, string> = {
    CLICOLOR_FORCE: "1",
    RUST_LOG: "off,xtask=debug,meta=debug",
    RUST_SPANTRACE: "1",
    // "RUST_BACKTRACE": "short",
    RUST_MIN_STACK: "8388608",
    LOG_LEVEL: "DEBUG",
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
    PATH: `${wd.join("target/debug").toString()}:${Deno.env.get("PATH")}`,
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

  interface Result {
    testFile: string;
    duration: number;
    success: boolean;
  }

  interface Run {
    promise: Promise<Result>;
    output: ReadableStream<string>;
    done: boolean;
    streamed: boolean;
  }

  const xtask = wd.join("target/debug/xtask");
  const denoConfig = wd.join("typegate/deno.jsonc");

  function createRun(testFile: string): Run {
    const start = Date.now();
    const child =
      $.raw`${xtask} deno test --config=${denoConfig} ${testFile} ${flags}`
        .cwd(wd)
        .env(env)
        .stdout("piped")
        .stderr("piped")
        .noThrow()
        .spawn();

    const output = mergeReadableStreams(child.stdout(), child.stderr())
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
      streamed: false,
    };
  }

  const queues = [...filteredTestFiles];
  const runs: Record<string, Run> = {};
  const globalStart = Date.now();

  $.logStep(`${prefix} Building xtask and meta-cli...`);
  await $`cargo build -p meta-cli -F typegate
          && mv target/debug/meta target/debug/meta-full
          && cargo build -p xtask -p meta-cli`.cwd(wd);

  // launch a promise that doesnt get awaited
  (async () => {
    while (queues.length > 0) {
      const current = Object.values(runs)
        .filter((r) => !r.done)
        .map((r) => r.promise);
      if (current.length <= threads) {
        const next = queues.shift()!;
        runs[next] = createRun(next);
      } else {
        const result = await Promise.any(current);
        runs[result.testFile].done = true;
      }
    }
  })();

  let nexts = Object.keys(runs);
  do {
    const file = nexts.find((f) => !runs[f].done) ?? nexts[0];
    const run = runs[file];
    run.streamed = true;

    $.logStep(`${prefix} Launched ${wd.relative(file)}`);
    for await (const line of run.output) {
      if (line.startsWith("warning: skipping duplicate package")) {
        // https://github.com/rust-lang/cargo/issues/10752
        continue;
      }
      $.log(line);
    }

    const { duration } = await run.promise;
    $.logStep(
      `${prefix} Completed ${wd.relative(file)} in ${duration / 1_000}s`
    );

    nexts = Object.keys(runs).filter((f) => !runs[f].streamed);
  } while (nexts.length > 0);

  const globalDuration = Date.now() - globalStart;
  const finished = await Promise.all(Object.values(runs).map((r) => r.promise));
  const successes = finished.filter((r) => r.success);
  const failures = finished.filter((r) => !r.success);

  $.log();
  $.log(
    `Tests completed in ${Math.floor(globalDuration / 60_000)}m${
      Math.floor(globalDuration / 1_000) % 60
    }s:`
  );

  for (const run of finished.sort((a, b) => a.duration - b.duration)) {
    $.log(
      ` - ${Math.floor(run.duration / 60_000)}m${
        Math.floor(run.duration / 1_000) % 60
      }s -- ${run.success ? "" : "FAILED -"}${wd.relative(run.testFile)}`
    );
  }

  $.log(`  successes: ${successes.length}/${filteredTestFiles.length}`);
  $.log(`  failures: ${failures.length}/${filteredTestFiles.length}`);
  const filteredOutCount = testFiles.length - filteredTestFiles.length;
  if (filteredOutCount > 0) {
    $.log(`  ${filteredOutCount} test files were filtered out`);
  }

  $.log("");

  if (failures.length > 0) {
    $.logError("Errors were detected:");
    $.logGroup(() => {
      for (const failure of failures) {
        $.log(`- ${wd.relative(failure.testFile)}`);
      }
    });
    throw new Error("test errors detected");
  }
}

export async function testE2eCli(argv: string[]) {
  const flags = parseArgs(argv, {
    "--": true,
    string: ["threads", "f", "filter"],
  });
  await testE2e({
    files: flags._.map((item) => item.toString()),
    threads: flags.threads ? parseInt(flags.threads) : undefined,
    filter: flags.filter ?? flags.f,
    flags: flags["--"],
  });
}

if (import.meta.main) {
  await testE2eCli(Deno.args);
}
