// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { TypeGraphDS } from "@metatype/typegate/typegraph/mod.ts";
import { Meta } from "../../utils/mod.ts";
import { assert } from "@std/assert/";

Meta.test("serialization size test", async (mt) => {
  const raw = await mt.serialize("runtimes/prisma/type_duplication.ts");
  const size = new TextEncoder().encode(raw).length;
  assert(
    size < (1_240_000 * 8),
    `serialized size is too large ${Math.ceil(size / 1024)}KiB`,
  );

  const tg: TypeGraphDS = JSON.parse(
    raw,
  );
  console.log({size, length: tg.types.length});
  assert(
    tg.types.length < 30_000,
    `typegraph has too many types: ${tg.types.length}`,
  );
});
