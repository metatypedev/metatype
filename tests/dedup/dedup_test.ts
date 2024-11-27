// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "test-utils/mod.ts";
import { Typegraph } from "@metatype/typegate/typegraph/types.ts";
import { assert, assertEquals } from "@std/assert";

Meta.test({
  name: "dedup test",
}, async (_t) => {
  const { stdout } = await Meta.cli(
    "serialize",
    "--pretty",
    "-f",
    "dedup/tg.ts",
  );
  const tg: Typegraph[] = JSON.parse(stdout);
  console.log(tg);
  const ints = [];
  const strs = [];
  for (const ty of tg[0].types) {
    if (ty.type == "integer") {
      ints.push(ty);
    }
    if (ty.type == "string") {
      strs.push(ty);
    }
  }
  assertEquals(ints.length, 2);
  assert(ints.some((ty) => ty.title == "namedInt"));
  assertEquals(strs.length, 3);
  assert(strs.some((ty) => ty.format == "uuid"));
  assertEquals(strs.filter((ty) => ty.format == "date-time").length, 1);
});
