// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { existsSync } from "std/fs/exists.ts";
import { copySync } from "std/fs/copy.ts";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import config from "../../../src/config.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

function stripIncomparable(json: string) {
  return [
    // FIXME: python and deno does not produce the same tarball
    (source: string) => source.replace(/"file:scripts\/.+;(.+)"/g, '""'),
  ].reduce((prev, op) => op(prev), json);
}

async function testSerializeAllPairs(t: MetaTest, dirPath: string) {
  const tempDir = Deno.makeTempDirSync({
    dir: config.tmp_dir,
  });

  copySync(resolve(dirPath), tempDir, { overwrite: true });

  const skip = [
    // FIXME:
    "rest", // python and typescript generates different indentation for g.rest
    // TODO: why are these failing?
    "random",
    "func",
    "prisma",
    "reduce",
  ];

  for await (
    const file of expandGlob(join(tempDir, "*.py"), {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    })
  ) {
    const name = file.name.replace(/\.py$/, "");
    if (skip.includes(name)) {
      continue;
    }

    const pyPath = file.path;
    const tsPath = pyPath.replace(/\.py$/, ".ts");

    if (existsSync(tsPath)) {
      // for now, run the typegraph assuming it is deno
      // FIXME: type hint issue with deno
      const data = (await Deno.readTextFile(tsPath)).replace(
        /\(\s*g\s*\)/,
        "(g: any)",
      );

      // FIXME:
      if (/fromLambda|from_lambda|fromDef|from_def/.test(data)) {
        // skip these for now, reasons:
        // deno directly use the given string value
        // python parse its own source
        continue;
      }

      const { stdout: pyVersion } = await Meta.cli(
        "serialize",
        "--pretty",
        "-f",
        pyPath,
      );

      const tsTempPath = join(tempDir, `${name}.ts`);
      Deno.writeTextFileSync(tsTempPath, data);
      const { stdout: tsVersion } = await Meta.cli(
        "serialize",
        "--pretty",
        "-f",
        tsTempPath,
      );

      await t.should(
        `serialize and compare python and typescript version of ${name})}`,
        () => {
          assertEquals(
            stripIncomparable(pyVersion),
            stripIncomparable(tsVersion),
          );
        },
      );
    }
  }
}

Meta.test("typegraphs comparison", async (t) => {
  await testSerializeAllPairs(t, "website/typegraphs");
});
