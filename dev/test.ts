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
  Fuse,
  join,
  mergeReadableStreams,
  parseFlags,
  resolve,
  TextLineStream,
} from "./deps.ts";
import { projectDir, relPath } from "./utils.ts";

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
const prefixLength = `${projectDir}/typegate/tests/`.length;
const fuse = new Fuse(testFiles.map((f) => f.slice(prefixLength)), {
  includeScore: true,
  useExtendedSearch: true,
  threshold: 0.4,
});
const filtered = filter ? fuse.search(filter) : null;
const filteredTestFiles = filtered?.map((res) => testFiles[res.refIndex]) ??
  testFiles;

const tmpDir = join(projectDir, "tmp");
const env: Record<string, string> = {
  "RUST_LOG": "off,xtask=debug,meta=debug",
  "RUST_BACKTRACE": "0",
  "RUST_SPANTRACE": "1",
  "RUST_LIB_BACKTRACE": "1",
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
  "PATH": `${join(projectDir, "target/debug")}:${Deno.env.get("PATH")}`,
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

const xtask = join(projectDir, "target/debug/xtask");
const denoConfig = join(projectDir, "typegate/deno.jsonc");

function createRun(testFile: string): Run {
  const start = Date.now();
  const child = new Deno.Command(xtask, {
    args: [
      "deno",
      "test",
      `--config=${denoConfig}`,
      testFile,
      ...flags["--"],
    ],
    cwd: projectDir,
    stdout: "piped",
    stderr: "piped",
    env: { ...Deno.env.toObject(), ...env },
  }).spawn();

  const output = mergeReadableStreams(child.stdout, child.stderr).pipeThrough(
    new TextDecoderStream(),
  ).pipeThrough(new TextLineStream());

  const promise = child.status.then(({ success }) => {
    const end = Date.now();
    return { success, testFile, duration: end - start };
  }).catch(({ success }) => {
    const end = Date.now();
    return { success, testFile, duration: end - start };
  });

  return {
    promise,
    output,
    done: false,
    streamed: false,
  };
}

async function buildXtask() {
  console.log(`${prefix} Building xtask...`);
  const child = new Deno.Command("cargo", {
    args: ["build", "--package", "xtask"],
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) {
    throw new Error("Failed to build xtask");
  }
}

async function buildMetaCli() {
  console.log(`${prefix} Building meta-cli...`);
  const child = new Deno.Command("cargo", {
    args: ["build", "--package", "meta-cli"],
    cwd: projectDir,
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  if (!status.success) {
    throw new Error("Failed to build meta-cli");
  }
}

const queues = [...filteredTestFiles];
const runs: Record<string, Run> = {};
const globalStart = Date.now();

await buildXtask();
await buildMetaCli();

void (async () => {
  while (queues.length > 0) {
    const current = Object.values(runs).filter((r) => !r.done).map((r) =>
      r.promise
    );
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
  const file = nexts.find((f) => !runs[f].done) ??
    nexts[0];
  const run = runs[file];
  run.streamed = true;

  console.log(`${prefix} Launched ${relPath(file)}`);
  for await (const line of run.output) {
    if (line.startsWith("warning: skipping duplicate package")) {
      // https://github.com/rust-lang/cargo/issues/10752
      continue;
    }
    console.log(line);
  }

  const { duration } = await run.promise;
  console.log(
    `${prefix} Completed ${relPath(file)} in ${duration / 1_000}s`,
  );

  nexts = Object.keys(runs).filter((f) => !runs[f].streamed);
} while (nexts.length > 0);

const globalDuration = Date.now() - globalStart;
const finished = await Promise.all(Object.values(runs).map((r) => r.promise));
const successes = finished.filter((r) => r.success);
const failures = finished.filter((r) => !r.success);

console.log("\n");
console.log(
  `Tests completed in ${Math.floor(globalDuration / 60_000)}m${
    Math.floor(globalDuration / 1_000) % 60
  }s:`,
);

for (const run of finished.sort((a, b) => a.duration - b.duration)) {
  console.log(
    ` - ${Math.floor(run.duration / 60_000)}m${
      Math.floor(run.duration / 1_000) % 60
    }s -- ${run.success ? "" : "FAILED -"}${run.testFile}`,
  );
}

console.log(
  `  successes: ${successes.length}/${filteredTestFiles.length}`,
);
console.log(
  `  failures: ${failures.length}/${filteredTestFiles.length}`,
);
const filteredOutCount = testFiles.length - filteredTestFiles.length;
if (filteredOutCount > 0) {
  console.log(
    `  ${filteredOutCount} test files were filtered out`,
  );
}

console.log("");

if (failures.length > 0) {
  console.log("Some errors were detected:");
  for (const failure of failures) {
    console.log(`- ${failure.testFile}`);
  }
  Deno.exit(1);
}
