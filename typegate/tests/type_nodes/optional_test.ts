// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.
import { gql, test } from "../utils.ts";

test("Poll", async (t) => {
  const e = await t.pythonFile("type_nodes/optional_node.py");

  await t.should("allow query with an array of optionals", async () => {
    await gql`
      query {
        countVotes(votes: ["red", "red", "blue", "green", null, null]) {
          red
          blue
          green
          purple
          blank
        }
      }
    `
      .expectData({
        countVotes: {
          red: 2,
          blue: 1,
          green: 1,
          purple: 0,
          blank: 2,
        },
      })
      .on(e);
  });

  await t.should(
    "allow query a field that returns an array of optionals",
    async () => {
      await gql`
        query {
          sortVotes(votes: ["red", "red", "blue", "green", null, null])
        }
      `
        .expectData({
          sortVotes: ["blue", "green", null, null, "red", "red"],
        })
        .on(e);
    },
  );
});
