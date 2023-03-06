// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
  parseFlags,
  projectDir,
  resolve,
  run,
} from "./mod.ts";

const flags = parseFlags(Deno.args, { "--": true });

const testFiles = [];

// find test files
if (flags._.length === 0) {
  // run all the tests
  for (
    const entry of expandGlobSync("typegate/tests/**/*_test.ts", {
      root: projectDir,
    })
  ) {
    testFiles.push(entry.path);
  }
} else {
  for (const f of flags._) {
    const path = resolve(projectDir, "typegate/tests", f as string);
    const stat = await Deno.stat(path);

    if (stat.isDirectory) {
      for (const entry of expandGlobSync("**/*_test.ts", { root: path })) {
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

if (Deno.build.os === "darwin") {
  Deno.env.set(
    "DYLD_LIBRARY_PATH",
    `${Deno.env.get("HOME")}/.wasmedge/lib:DYLD_LIBRARY_PATH`,
  );
}

const failures = [];
for await (const testFile of testFiles) {
  const status = await run([
    "deno",
    "task",
    "test",
    testFile,
    ...flags["--"],
  ], resolve(projectDir, "typegate"));

  if (!status.success) {
    failures.push(testFile);
  }
}

if (failures.length > 0) {
  console.log("Some errors were detected:");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  Deno.exit(1);
}
