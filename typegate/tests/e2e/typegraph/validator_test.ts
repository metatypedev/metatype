// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { TestModule } from "test-utils/test_module.ts";
import { Meta } from "test-utils/mod.ts";
import { fail } from "@std/assert";

const m = new TestModule(import.meta);

Meta.test("typegraph validation", async (t) => {
  await t.should(
    "fail to serialize typegraph with invalid injection",
    async () => {
      try {
        await m.cli(
          {
            env: {
              RUST_LOG: "error",
              RUST_BACKTRACE: "0",
              RUST_SPANTRACE: "0",
              RUST_LIB_BACKTRACE: "0",
              RUST_ERR_LOCATION: "0",
            },
          },
          "serialize",
          "-f",
          "validator.py",
        );
        fail("should have thrown");
      } catch (e) {
        console.log(e);
        await t.assertSnapshot(e.stderr);
      }
    },
  );
});
