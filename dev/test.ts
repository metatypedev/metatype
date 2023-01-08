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
  dirname,
  fromFileUrl,
  resolve,
} from "https://deno.land/std@0.170.0/path/mod.ts";
import { parse } from "https://deno.land/std@0.170.0/flags/mod.ts";
import { expandGlob } from "https://deno.land/std@0.170.0/fs/mod.ts";

const flags = parse(Deno.args, { "--": true });

const thisDir = dirname(fromFileUrl(import.meta.url));
const typegateDir = resolve(thisDir, "../typegate");

const testFiles = [];

// find test files
if (flags._.length === 0) {
  // run all the tests
  for await (
    const entry of expandGlob("tests/**/*_test.ts", {
      root: typegateDir,
    })
  ) {
    testFiles.push(entry.path);
  }
} else {
  for (const f of flags._) {
    const path = resolve(typegateDir, "tests", f as string);
    const stat = await Deno.stat(path);

    if (stat.isDirectory) {
      for await (const entry of expandGlob("**/*_test.ts", { root: path })) {
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

const failures = [];
for await (const testFile of testFiles) {
  const cmd = [
    "deno",
    "test",
    "--unstable",
    "--allow-all",
    testFile,
    ...flags["--"],
  ];
  const p = Deno.run({
    cmd,
    cwd: typegateDir,
    env: Deno.env.toObject(),
  });
  const status = await p.status();
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
