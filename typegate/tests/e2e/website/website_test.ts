// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";
import { existsSync } from "std/fs/exists.ts";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import config from "../../../src/config.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

async function testSerializeAllPairs(t: MetaTest, path: string) {
  let success = 0;
  let count = 0;

  for await (
    const file of expandGlob(path, {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    })
  ) {
    const name = file.name.replace(/\.py$/, "");
    const pyPath = file.path;
    const tsPath = pyPath.replace(/\.py$/, ".ts");

    if (existsSync(tsPath)) {
      count += 1;
      const { stdout: pyVersion } = await Meta.cli(
        "serialize",
        "--pretty",
        "-f",
        pyPath,
      );

      // for now, run the typegraph assuming it is deno
      // FIXME: type hint issue with deno
      const data = (await Deno.readTextFile(tsPath)).replace(
        /\(\s*g\s*\)/,
        "(g: any)",
      );
      const tsTempPath = Deno.makeTempFileSync({
        dir: config.tmp_dir,
        suffix: ".ts",
      });
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
          assertEquals(pyVersion, tsVersion);
          success += 1;
        },
      );
    }
  }

  console.log(`Comparison success ${success}/${count}`);
}

Meta.test("typegraphs creation", async (t) => {
  await testSerializeAllPairs(t, "./../../../../website/typegraphs/*.py");
});
