// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "../../utils/mod.ts";
import { assert } from "@std/assert/";

Meta.test("serialization size test", async (mt) => {
  const raw = await mt.serialize("runtimes/prisma/type_duplication.ts");
  const size = new TextEncoder().encode(raw).length;
  assert(
    size < 102_400,
    `serialized size is too large ${Math.ceil(size / 1024)}KiB`,
  );
});
