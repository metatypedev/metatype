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
    "work as normal after invariant apply + work with partial static injections",
    async () => {
      await gql`
        query {
          testInvariantB (
            student: {
              name: "Jake",
              infos: { age: 15 }
              distinctions: { medals: 7 }
            }
          ) {
            id
            name
            infos { age school }
            distinctions {
              awards { name points }
              medals
            }
          }
        }
      `.expectData({
        testInvariantB: {
          id: 1234, // from apply
          name: "Jake", // from user
          infos: { age: 15 }, // from user
          distinctions: {
            awards: [ // from apply
              { name: "Chess", points: 1000 },
              { name: "Math Olympiad", points: 100 },
            ],
            medals: 7, // from user
          },
        },
      })
        .on(e);
    },
  );
});
