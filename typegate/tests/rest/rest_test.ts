// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals } from "std/testing/asserts.ts";
import { gql, Meta, rest } from "../utils/mod.ts";

Meta.test("Rest queries in Python", async (t) => {
  const e = await t.engine("rest/custom.py");

  await t.should("work with simple rest requests", async () => {
    await rest.get("ping")
      .expectJSON({
        ping: 1,
      })
      .on(e);
  });

  await t.should("not allow dynamic requests", async () => {
    await gql`
      query ping {
        ping
      }
    `
      .withVars({ id: 1 })
      .expectStatus(404)
      .on(e);
  });
});

Meta.test("Rest queries in Deno", async (t) => {
  const e = await t.engine("rest/rest.ts");

  await t.should("work with simple rest requests", async () => {
    await rest.get("get_post_id?id=1")
      .expectJSON({
        postFromUser: {
          id: 12,
        },
      })
      .on(e);

    await rest.get("get_post_id")
      .expectJSON({
        postFromUser: {
          id: 12,
        },
      })
      .withVars({ id: 1 })
      .on(e);
  });

  await t.should("allow dynamic requests", async () => {
    await gql`
      query get_post_id($id: Integer) {
        postFromUser(id: $id) {
          id
        }
      }
    `
      .withVars({ id: 1 })
      .expectStatus(200)
      .expectData({
        postFromUser: {
          id: 12,
        },
      })
      .on(e);
  });

  await t.should("split multiple queries on same file", async () => {
    await rest.get("get_post")
      .withVars({ id: 1 })
      .expectJSON({
        postFromUser: {
          id: 12,
          author: {
            id: 1,
          },
        },
      })
      .on(e);
  });

  await t.should("split mutation by on their effect", async () => {
    await rest.get("read_post")
      .expectStatus(404)
      .on(e);

    await rest.put("read_post")
      .withVars({ id: 1 })
      .expectJSON({
        read: true,
      })
      .on(e);
  });

  await t.should("fetch openapi spec", async () => {
    await rest.get("__schema")
      .matchSnapshot(t)
      .on(e);
  });

  await t.should("fail when method is not get", async () => {
    await rest.post("__schema")
      .expectBody((body) => {
        assertEquals(
          body.message,
          "/rest/rest/__schema does not support POST method",
        );
      })
      .on(e);
  });
});
