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

const localDir = dirname(fromFileUrl(import.meta.url));

const testFiles = [];

// find test files
if (flags._.length === 0) {
  // run all the tests
  for await (const entry of expandGlob("tests/**/*_test.ts")) {
    testFiles.push(entry.path);
  }
} else {
  for (const f of flags._) {
    const path = resolve(localDir, "tests", f as string);
    const stat = await Deno.stat(path);
    if (stat.isDirectory) {
      for await (const entry of expandGlob("*_test.ts", { root: path })) {
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

setVenvVars(resolve(localDir, "../typegraph/.venv"));
Deno.env.set("DENO_ENV", "test");

for await (const testFile of testFiles) {
  await runOne(testFile);
}

//
// functions

async function runOne(file: string) {
  const cmd = [
    "deno",
    "test",
    "--unstable",
    "--allow-all",
    file,
    ...flags["--"],
  ];
  const p = Deno.run({
    cmd,
    cwd: localDir,
  });

  const status = await p.status();
  if (!status.success) {
    Deno.exit(status.code);
  }
}

function setVenvVars(venvDir: string): Record<string, string> {
  const bin = resolve(venvDir, "bin");
  Deno.env.set("VIRTUAL_ENV", venvDir);
  const pathEnvSep = Deno.build.os === "windows" ? ";" : ":";
  Deno.env.set("PATH", `${bin}${pathEnvSep}${Deno.env.get("PATH")}`);
  return {
    "VIRTUAL_ENV": venvDir,
    "PATH": `${bin}:${Deno.env.get("PATH") ?? ""}`,
  };
}
