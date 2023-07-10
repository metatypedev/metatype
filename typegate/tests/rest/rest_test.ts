// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, test } from "../utils.ts";

test("Rest queries", async (t) => {
  const e = await t.pythonFile("rest/custom.py");

  await t.should("work with simple request", async () => {
    await gql`
      query {
        posts {
          id
          title
          summary
          content
        }
      }
    `
      .expectData({
        posts: [],
      })
      .on(e);
  });
});
