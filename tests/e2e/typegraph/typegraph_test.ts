// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { expandGlob } from "@std/fs/expand-glob";
import { dirname, fromFileUrl } from "@std/path";
import { Meta } from "../../utils/mod.ts";
import { MetaTest } from "../../utils/test.ts";

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
      const { stdout: tg } = await Meta.cli(
        "serialize",
        "--pretty",
        "-f",
        file.path,
      );
      await t.assertSnapshot(tg);
    });
  }
}

Meta.test("typegraphs creation", async (t) => {
  await testSerializeAll(t, "typegraphs/python/*.py");
  await testSerializeAll(t, "typegraphs/deno/*.ts");
});
