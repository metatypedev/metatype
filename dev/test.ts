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
  mergeReadableStreams,
  parseFlags,
  projectDir,
  resolve,
  TextLineStream,
} from "./mod.ts";

const flags = parseFlags(Deno.args, { "--": true, string: ["threads"] });

const testFiles = [];

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

const env: Record<string, string> = {
  "NO_COLOR": "true",
  "DEBUG": "true",
  "PACKAGED": "false",
  "TG_SECRET":
    "a4lNi0PbEItlFZbus1oeH/+wyIxi9uH6TpL8AIqIaMBNvp7SESmuUBbfUwC0prxhGhZqHw8vMDYZAGMhSZ4fLw==",
  "TG_ADMIN_PASSWORD": "password",
  "REDIS_URL": "redis://:password@localhost:6379/0",
  "DENO_TESTING": "true",
};

const libPath = Deno.build.os === "darwin"
  ? "DYLD_LIBRARY_PATH"
  : "LD_LIBRARY_PATH";
const wasmEdgeLib = `${Deno.env.get("HOME")}/.wasmedge/lib`;

if (!Deno.env.get(libPath)?.includes(wasmEdgeLib)) {
  env[libPath] = `${wasmEdgeLib}:${Deno.env.get(libPath) ?? ""}`;
}

const threads = flags.threads ? parseInt(flags.threads) : 4;
const failures = [];

for (let i = 0; i < testFiles.length; i += threads) {
  const tests = [];

  for (let j = 0; j < threads && i + j < testFiles.length; j += 1) {
    const testFile = testFiles[i + j];

    const p = new Deno.Command("deno", {
      args: [
        "task",
        "test",
        testFile,
        ...flags["--"],
      ],
      cwd: resolve(projectDir, "typegate"),
      stdout: "piped",
      stderr: "piped",
      env: { ...Deno.env.toObject(), ...env },
    }).spawn();

    const output = mergeReadableStreams(p.stdout, p.stderr).pipeThrough(
      new TextDecoderStream(),
    ).pipeThrough(new TextLineStream());

    tests.push({ status: p.status, output, testFile });
  }

  for (const { status, output, testFile } of tests) {
    for await (const line of output) {
      console.log(line);
    }
    console.log("\n");

    const { success } = await status;
    if (!success) {
      failures.push(testFile);
    }
  }
}

if (failures.length > 0) {
  console.log("Some errors were detected:");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  Deno.exit(1);
}
