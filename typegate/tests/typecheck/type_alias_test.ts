// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("Random", async (t) => {
  const e = await t.pythonFile("typecheck/type_alias.py");

  await t.should("work", async () => {
    await gql`
      query {
        get_message {
          id
          title
          user_id
        }
        some_alias: get_message {
          id
          title
          user_id
        }
      }
    `
      .expectBody((body: any) => {
        console.info(body);
      })
      .on(e);
  });
});
