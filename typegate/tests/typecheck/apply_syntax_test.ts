// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("deno(sdk): apply", async (t) => {
  const e = await t.engine("typecheck/apply.ts");

  await t.should(
    "work as normal if all nodes have g.inherit() flag",
    async () => {
      await gql`
        query {
          testInvariantA (
            student: {
              id: 1,
              name: "Jake",
              infos: { age: 15 }
            }
          ) {
          id
          name
          infos { age school }
          }
        }
      `.expectData({
        testInvariantA: {
          id: 1,
          name: "Jake",
          infos: { age: 15 },
        },
      })
        .on(e);
    },
  );

  await t.should(
    "work as normal if all first level nodes have g.inherit()",
    async () => {
      await gql`
        query {
          testInvariantB (
            student: {
              id: 1,
              name: "Jake",
              infos: { age: 15 }
            }
          ) {
          id
          name
          infos { age school }
          }
        }
      `.expectData({
        testInvariantB: {
          id: 1,
          name: "Jake",
          infos: { age: 15 },
        },
      })
        .on(e);
    },
  );
});
