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
  expandGlobSync,
  join,
  mergeReadableStreams,
  parseFlags,
  resolve,
  TextLineStream,
} from "./deps.ts";
import { projectDir, relPath } from "./utils.ts";

const flags = parseFlags(Deno.args, { "--": true, string: ["threads"] });

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

const cwd = resolve(projectDir, "typegate");
const tmpDir = join(projectDir, "tmp");
const env: Record<string, string> = {
  "LOG_LEVEL": "DEBUG",
  "NO_COLOR": "true",
  "DEBUG": "true",
  "PACKAGED": "false",
  "TG_SECRET":
    "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==",
  "TG_ADMIN_PASSWORD": "password",
  "REDIS_URL": "redis://:password@localhost:6379/0",
  "DENO_TESTING": "true",
  "TMP_DIR": tmpDir,
  "TIMER_MAX_TIMEOUT_MS": "15000",
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

interface Run {
  result: Promise<
    {
      testFile: string;
      duration: number;
      success: boolean;
    }
  >;
  output: ReadableStream<string>;
  terminated: boolean;
  logged: boolean;
}

function createRun(testFile: string): Run {
  const start = Date.now();
  const child = new Deno.Command("deno", {
    args: [
      "task",
      "test",
      testFile,
      ...flags["--"],
    ],
    cwd,
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), ...env },
  }).spawn();

  const output = mergeReadableStreams(child.stdout, child.stderr).pipeThrough(
    new TextDecoderStream(),
  ).pipeThrough(new TextLineStream());

  const result = child.status.then(({ success }) => {
    const end = Date.now();
    return { success, testFile, duration: end - start };
  }).catch(({ success }) => {
    const end = Date.now();
    return { success, testFile, duration: end - start };
  });

  return {
    result,
    output,
    terminated: false,
    logged: false,
  };
}

const queues = [...testFiles];
const runs: Record<string, Run> = {};
const failures: string[] = [];

void (async () => {
  while (queues.length > 0) {
    const current = Object.values(runs).filter((r) => !r.terminated).map((r) =>
      r.result
    );
    if (current.length <= threads) {
      const next = queues.shift()!;
      runs[next] = createRun(next);
    } else {
      const done = await Promise.any(current);
      // may already be removed by the logger
      if (runs[done.testFile]) {
        runs[done.testFile].terminated = true;
      }
    }
  }
})();

while (Object.keys(runs).length > 0) {
  const file = Object.keys(runs).find((f) =>
    runs[f].terminated && !runs[f].logged
  ) ??
    Object.keys(runs)[0];
  const run = runs[file];
  run.logged = true;

  console.log(`${prefix} Launched ${relPath(file)}`);
  for await (const line of run.output) {
    if (line.startsWith("warning: skipping duplicate package")) {
      // https://github.com/rust-lang/cargo/issues/10752
      continue;
    }
    console.log(line);
  }

  const { success, duration } = await run.result;

  console.log(
    `${prefix} Completed ${relPath(file)} in ${duration / 1000}ms`,
  );
  if (!success) {
    failures.push(file);
  }
}

if (failures.length > 0) {
  console.log("Some errors were detected:");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  Deno.exit(1);
}
