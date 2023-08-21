// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals, assertStringIncludes } from "std/assert/mod.ts";
import { gql, Meta, rest } from "../utils/mod.ts";
import { RestSchemaGenerator } from "../../src/typecheck/rest_schema_generator.ts";

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

  await t.should("work with object", async () => {
    await rest.get("get_identity")
      .withVars({
        obj: {
          a: 1,
          b: { c: 2 },
          d: "email@example.com",
          e: [1, 2, "three"],
          f: 2.5,
        },
      })
      .expectJSON({
        identity: {
          a: 1,
          b: { c: 2 },
          d: "email@example.com",
          e: [1, 2, "three"],
          f: 2.5,
        },
      })
      .on(e);
  });

  await t.should("not validate argument type", async () => {
    await rest.get("get_identity")
      .withVars({
        obj: {
          a: 1,
          b: { c: "string" },
          d: "string",
        },
      })
      .expectBody((res) => {
        assertStringIncludes(
          res["message"],
          "at <value>.input.b.c: expected number, got string",
        );
      })
      .on(e);
  });

  await t.should(
    "throw an error upon missing variable in parameters",
    async () => {
      await rest.get("get_identity")
        .withVars({ badField: {} })
        .expectBody((res) => {
          assertStringIncludes(
            res["message"],
            'missing variable "obj" value',
          );
        })
        .on(e);
    },
  );

  await t.should("fetch openapi spec", async () => {
    await rest.get("__schema")
      .matchSnapshot(t)
      .on(e);
  });

  await t.should("fetch api playground", async () => {
    await rest.get("/")
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

Meta.test("Rest schema generator", async (t) => {
  const e = await t.engine("rest/rest_schema.ts");
  const generator = new RestSchemaGenerator(e.tg);
  await t.should("generate schema with circular types", async () => {
    const res = generator.generateAll();
    await t.assertSnapshot(res);
  });
});
