// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TestModule } from "test-utils/test_module.ts";
import { Meta } from "test-utils/mod.ts";
import { assert } from "std/assert/mod.ts";

const m = new TestModule(import.meta);

Meta.test("typegraph validation", async (t) => {
  await t.should(
    "fail to serialize typegraph with invalid injection",
    async () => {
      try {
        await m.cli({}, "serialize", "-f", "typegraphs/python/validator.py");
        assert(false, "should have thrown");
      } catch (e) {
        await t.assertSnapshot(e.message);
      }
    },
  );
});
