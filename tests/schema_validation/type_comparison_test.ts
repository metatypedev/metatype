// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta } from "../utils/mod.ts";

Meta.test("type comparison test", async (t) => {
  try {
    const _e = await t.engine("schema_validation/type_comparison.py");
    throw new Error("Expected an error"); // TODO assert
  } catch (err: any) {
    if (!err.stderr) {
      throw err;
    }
    const errStart = "- at";
    const errEnd = "failed validation";
    const errOutput = err.stderr.slice(
      err.stderr.indexOf(errStart),
      err.stderr.indexOf(errEnd) + errEnd.length,
    );
    await t.assertSnapshot(errOutput, {
      name: "type comparison errors",
    });
    console.log(errOutput);
  }
});
