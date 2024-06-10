// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { dirname, fromFileUrl, join, resolve } from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";
import { copy } from "std/fs/copy.ts";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";
import { assertEquals } from "std/assert/assert_equals.ts";
import config from "../../../src/config.ts";
import { TypeGraphDS } from "../../../src/typegraph/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

function stripIncomparable(t: MetaTest, json: string) {
  return [
    // FIXME: python and deno does not produce the same tarball
    (source: string) =>
      Promise.resolve(source.replace(/"file:scripts(.)+?"/g, '""')),
    async (source: string) => {
      const tg: TypeGraphDS = JSON.parse(source)?.[0];
      await Promise.all(
        tg.materializers.map(async (mat) => {
          if (mat.name == "function") {
            const shellOut = await t.shell("deno fmt -".split(" "), {
              stdin: mat.data.script as string,
            });
            mat.data.script = shellOut.stdout;
          }
        }),
      );
      return JSON.stringify(tg, null, 2);
    },
  ].reduce((prev, op) => prev.then(op), Promise.resolve(json));
}

async function testSerializeAllPairs(t: MetaTest, dirPath: string) {
  const tempDir = await Deno.makeTempDir({
    dir: config.tmp_dir,
  });

  await copy(resolve(dirPath), tempDir, { overwrite: true });

  for await (
    const file of expandGlob(join(tempDir, "*.py"), {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    })
  ) {
    const name = file.name.replace(/\.py$/, "");

    const pyPath = file.path;
    const tsPath = pyPath.replace(/\.py$/, ".ts");

    if (await exists(tsPath)) {
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

      const tsTempPath = join(tempDir, `${name}.ts`);
      await Deno.writeTextFile(tsTempPath, data);

      const [{ stdout: pyVersion }, { stdout: tsVersion }] = await Promise.all([
        Meta.cli(
          "serialize",
          "--pretty",
          "-f",
          pyPath,
        ),
        Meta.cli(
          "serialize",
          "--pretty",
          "-f",
          tsTempPath,
        ),
      ]);

      await t.should(
        `serialize and compare python and typescript version of ${name}`,
        async () => {
          const [py, ts] = await Promise.all([
            stripIncomparable(t, pyVersion),
            stripIncomparable(t, tsVersion),
          ]);
          assertEquals(py, ts);
        },
      );
    }
  }
}

Meta.test("typegraphs comparison", async (t) => {
  await testSerializeAllPairs(t, "examples/typegraphs");
});
