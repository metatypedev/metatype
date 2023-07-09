// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { expandGlob } from "std/fs/expand_glob.ts";
import { meta, test } from "../../utils.ts";
import { MetaTest } from "../../utils/metatest.ts";
import { dirname, fromFileUrl } from "std/path/mod.ts";

export const thisDir = dirname(fromFileUrl(import.meta.url));

async function testSerializeAll(t: MetaTest, path: string) {
  for await (
    const file of expandGlob(path, {
      root: thisDir,
      includeDirs: false,
      globstar: true,
    })
  ) {
    await t.should(`serialize ${file.name}`, async () => {
      const tg = await meta("serialize", "--pretty", "-f", file.path);
      await t.assertSnapshot(tg);
    });
  }
}

test("typegraphs creation", async (t) => {
  await testSerializeAll(t, "typegraphs/python/*.py");
  await testSerializeAll(t, "typegraphs/deno/*.ts");
});
