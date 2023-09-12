// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("deno(sdk): apply", async (t) => {
  const e = await t.engine("typecheck/apply.ts");

  await t.should(
    "work as normal if if all each node has g.inherit() flag",
    async () => {
      await gql`
      query {
        test(
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
    `
        .expectData({
          test: {
            id: 1,
            name: "Jake",
            infos: { age: 15 },
          },
        })
        .on(e);
    },
  );
});
