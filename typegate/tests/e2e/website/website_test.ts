// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { dirname, fromFileUrl, join } from "std/path/mod.ts";
import { existsSync } from "std/fs/exists.ts";
import { copySync } from "std/fs/copy.ts";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import config from "../../../src/config.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

async function testSerializeAllPairs(t: MetaTest, path: string) {
  const tempDir = Deno.makeTempDirSync({
    dir: config.tmp_dir,
  });

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
    const scriptDir = join(dirname(tsPath), "scripts");
    if (!existsSync(scriptDir)) {
      copySync(scriptDir, tempDir);
    }

    if (existsSync(tsPath)) {
      // for now, run the typegraph assuming it is deno
      // FIXME: type hint issue with deno
      const data = (await Deno.readTextFile(tsPath)).replace(
        /\(\s*g\s*\)/,
        "(g: any)",
      );

      // FIXME:
      if (
        /fromLambda|from_lambda|fromDef|from_def/.test(data)
      ) {
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
          assertEquals(pyVersion, tsVersion);
        },
      );
    }
  }
}

Meta.test("typegraphs creation", async (t) => {
  await testSerializeAllPairs(
    t,
    "./../../../../website/typegraphs/*.py",
  );
});
