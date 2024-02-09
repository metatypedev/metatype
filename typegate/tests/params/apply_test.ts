// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("(python (sdk): apply)", async (t) => {
  const e = await t.engine("params/apply.py");

  await t.should("work with renamed params", async () => {
    await gql`
      query {
        renamed(first: 1, second: 2) {
          a b
        }
      }
    `
      .expectData({
        renamed: { a: 1, b: 2 },
      })
      .on(e);
  });
});
