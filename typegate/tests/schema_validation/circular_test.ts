// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("circular test", async (t) => {
  const tgPath = "schema_validation/circular.py";
  const e = await t.pythonFile(tgPath);

  await t.should("validate self-refering type", async () => {
    await gql`
        query {
          registerUser(
            user: {
              name: "John",
              professor: {name: "Kramer", parents: [], award: 6},
              parents: [],
              paper: {title: "Some paper", author: {name: "John", parents: []}},
              friends: [
               {name: "Bob", parents: [], friends: [{name: "Marc", parents: []}]},
               {name: "Marc", parents: []}
              ],
              award: 6
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
});
