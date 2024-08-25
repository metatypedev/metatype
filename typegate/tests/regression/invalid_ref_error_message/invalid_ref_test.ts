// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { assertRejects } from "@std/assert";

Meta.test("invalid ref", async (t) => {
  await assertRejects(
    () =>
      t.engine(
        "regression/invalid_ref_error_message/invalid_ref.py",
      ),
    "type name 'Post' has not been registered",
  );
});
