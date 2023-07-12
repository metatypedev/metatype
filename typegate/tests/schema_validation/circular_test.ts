// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("circular test", async (t) => {
  const tgPath = "schema_validation/circular.py";
  const e = await t.pythonFile(tgPath);

  await t.should("validate self-refering type", async () => {
    await gql`
        query {
          registerUser(
            user: {
              name: "John",
              professor: {name: "Kramer", parents: [], award: {count: 6}},
              parents: [],
              paper: {title: "Some paper", author: {name: "John", parents: []}},
              friends: [
               {name: "Bob", parents: [], friends: [{name: "Marc", parents: []}]},
               {name: "Marc", parents: []}
              ],
              award: {
                title: "Some Award",
                count: 2
              },
              root: {
                some_field: "Some value",
                depth_one: {name: "Carl", parents: []},
                depth_one_2: {name: "Bill", parents: []},
                depth_two: {
                  depth_three: {name: "Gates", parents: []}
                }
              }
            }
          )
          {
            message
            user {
              name
            }
          }
        }
      `
      .expectData({
        registerUser: {
          message: "John registered",
          user: {
            name: "John",
          },
        },
      })
      .on(e);
  });

  await t.should("not validate missing field", async () => {
    await gql`
        query {
          registerUser(
            user: {
              name: "John",
              professor: {name: "Kramer", parents: []},
              parents: [],
              friends: [ { name: "Marc"} ]
            }
          )
          {
            message
            user {
              name
            }
          }
        }
      `
      .expectErrorContains("mandatory argument 'user.friends.parents'")
      .on(e);
  });
});
