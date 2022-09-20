// Copyright Metatype under the Elastic License 2.0.

import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { gql, meta, test } from "./utils.ts";

test("Auth", async (t) => {
  Deno.env.set("TG_AUTH_GITHUB_CLIENT_ID", "client_id_1");
  Deno.env.set("TG_AUTH_GITHUB_CLIENT_SECRET", "client_secret_1");
  const e = await t.pythonFile("typegraphs/auth.py");
  Deno.env.delete("TG_INJECTION_TEST_VAR");
  Deno.env.delete("TG_AUTH_GITHUB_CLIENT_SECRET");

  await t.should("return no data when empty", async () => {
    await gql`
        query {
          all(x: 1) {
            x
          }
        }
      `
      .expectData({
        all: {
          x: 1,
        },
      })
      .on(e);
  });
});
