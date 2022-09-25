// Copyright Metatype under the Elastic License 2.0.

import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { gql, meta, test } from "./utils.ts";

import * as mf from "test/mock_fetch";

mf.install();

test("Auth", async (t) => {
  Deno.env.set("TG_AUTH_GITHUB_CLIENT_ID", "client_id_1");
  Deno.env.set("TG_AUTH_GITHUB_CLIENT_SECRET", "client_secret_1");
  const e = await t.pythonFile("typegraphs/auth.py");
  Deno.env.delete("TG_AUTH_GITHUB_CLIENT_ID");
  Deno.env.delete("TG_AUTH_GITHUB_CLIENT_SECRET");

  await t.should("allow public call", async () => {
    await gql`
        query {
          public(x: 1) {
            x
          }
        }
      `
      .expectData({
        public: {
          x: 1,
        },
      })
      .on(e);
  });

  await t.should("disallow unauthentified private call", async () => {
    await gql`
        query {
          private(x: 1) {
            x
          }
        }
      `
      .expectErrorContains("authorization failed")
      .on(e);
  });

  mf.mock("GET@/api/posts/:id", (_req, params) => {
    const postId = Number(params.id);
    if (postId > 1000) {
      return new Response(null, {
        status: 404,
      });
    }
    return new Response(JSON.stringify({}), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  });
});
