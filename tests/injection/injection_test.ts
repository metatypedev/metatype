// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";
import { assertRejects } from "@std/assert";
import { buildSchema, graphql } from "graphql";
import * as mf from "test/mock_fetch";
import { dropSchemas, recreateMigrations } from "../utils/migrations.ts";
import { freezeDate, unfreezeDate } from "../utils/date.ts";

Meta.test("Missing env var", async (t) => {
  await assertRejects(
    () => t.engine("injection/injection.py"),
    "cannot find env",
  );
});

const schema = buildSchema(`
  type User {
    id: Int!
    name: String!
    email: String!
  }

  type Query {
    user(id: Int!): User!
  }
`);

const POSTGRES =
  "postgresql://postgres:password@localhost:5432/db?schema=injection_test_prisma";

Meta.test("Injected values", async (t) => {
  const e = await t.engine("injection/injection.py", {
    secrets: { TEST_VAR: "3", POSTGRES },
  });

  await t.should("fail for missing context", async () => {
    await gql`
      query {
        test(a: 1) {
          raw_int
        }
      }
    `
      .expectErrorContains("'userId' not found at `<context>`")
      .on(e);
  });

  await t.should("inject values", async () => {
    await gql`
      query {
        test(a: 12) {
          raw_int
          raw_str
          secret
          context
          optional_context
          parent {
            a2
          }
          raw_obj {
            in
          }
        }
      }
    `
      .withContext({
        userId: "123",
      })
      .expectData({
        test: {
          raw_int: 1,
          raw_str: "2",
          secret: 3,
          context: "123",
          optional_context: null,
          parent: {
            a2: 12,
          },
          raw_obj: {
            in: -1,
          },
        },
      })
      .on(e);
  });

  await t.should("refuse injected variables", async () => {
    await gql`
      query {
        test(a: 0, raw_int: 1) {
          a
          raw_int
        }
      }
    `
      .expectErrorContains("Unexpected value for injected parameter 'raw_int'")
      .on(e);
  });

  await t.should("inject the right value matching the effect", async () => {
    await gql`
      query {
        effect_none {
          operation
        }
      }
    `
      .expectData({
        effect_none: { operation: "read" },
      })
      .on(e);
    await gql`
      mutation {
        effect_create {
          operation
        }
        effect_delete {
          operation
        }
        effect_update {
          operation
        }
      }
    `
      .expectData({
        effect_create: { operation: "insert" },
        effect_delete: { operation: "remove" },
        effect_update: { operation: "modify" },
      })
      .on(e);
  });

  await t.should("inject into union", async () => {
    await gql`
      query {
        union(integer: 12, string: "hello") {
          integer
          string
          injected {
            union1
            union2
            either1
            either2
          }
        }
      }
    `
      .expectData({
        union: {
          integer: 12,
          string: "hello",
          injected: {
            union1: 12,
            union2: "hello",
            either1: 12,
            either2: "hello",
          },
        },
      })
      .on(e);
  });
});

mf.install();

mf.mock("POST@/api/graphql", async (req) => {
  const { query, variables } = await req.json();
  const res = await graphql({
    schema,
    source: query,
    rootValue: {
      user: ({ id }: { id: number }) => ({
        id,
        name: `User ${id}`,
        email: `user.${id}@example.com`,
      }),
    },
    variableValues: variables,
  });
  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

Meta.test("Injection from/into graphql", async (t) => {
  const e = await t.engine("injection/injection.py", {
    secrets: { TEST_VAR: "3", POSTGRES },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  await t.should("inject params to graphql", async () => {
    await gql`
      query {
        test(a: 12) {
          graphql {
            id
            name
          }
        }
      }
    `
      .withContext({
        userId: "123",
      })
      .expectData({
        test: {
          graphql: {
            id: 12,
            name: "User 12",
          },
        },
      })
      .on(e);
  });

  await t.should("get non-selected dependencies from graphql", async () => {
    await gql`
      query {
        user(id: 12) {
          id
          from_parent {
            email
          }
        }
      }
    `
      .expectData({
        user: {
          id: 12,
          from_parent: {
            email: "user.12@example.com",
          },
        },
      })
      .on(e);
  });

  await t.should("inject values into prisma", async () => {
    await gql`
      query {
        user(id: 12) {
          name
          email
          messagesSent {
            id
            text
            senderId
            recipientId
          }
        }
      }
    `
      .expectData({
        user: {
          name: "User 12",
          email: "user.12@example.com",
          messagesSent: [],
        },
      })
      .on(e);
  });
});

Meta.test("dynamic value injection", async (t) => {
  const e = await t.engine("injection/injection.py", {
    secrets: { TEST_VAR: "3", POSTGRES },
  });

  freezeDate();
  await t.should("generate date", async () => {
    await gql`
      query {
        test(a: 12) {
          date
        }
      }
    `
      .withContext({
        userId: "123",
      })
      .expectData({
        test: {
          date: new Date().toISOString(),
        },
      })
      .on(e);
  });
  unfreezeDate();
});

Meta.test("Deno: value injection", async (t) => {
  const e = await t.engine("injection/injection.ts", {
    secrets: { TEST_VAR: "3" },
  });

  freezeDate();
  await t.should("work", async () => {
    await gql`
      query {
        test(input: { a: 12 }) {
          input {
            a
            context
            optional_context
            raw_int
            raw_obj {
              in
            }
            alt_raw
            alt_secret
            alt_context_opt
            alt_context_opt_missing
            date
          }
        }
      }
    `
      .withContext({
        userId: "123",
      })
      .expectData({
        test: {
          input: {
            a: 12,
            context: "123",
            optional_context: null,
            raw_int: 4,
            raw_obj: { in: -1 },
            alt_raw: "2",
            alt_secret: "3",
            alt_context_opt: "123",
            alt_context_opt_missing: "123",
            date: new Date().toISOString(),
          },
        },
      })
      .on(e);
  });
  unfreezeDate();
});

Meta.test("Injection from nested context", async (t) => {
  const e = await t.engine("injection/nested_context.py");

  await t.should("access injected nested context", async () => {
    await gql`
      query {
        injectedId {
          id
        }
      }
    `
      .withContext({ profile: { id: 123 } })
      .expectData({
        injectedId: {
          id: 123,
        },
      })
      .on(e);
  });

  await t.should(
    "access injected nested context with array index",
    async () => {
      await gql`
        query {
          secondProfileData {
            second
          }
        }
      `
        .withContext({
          profile: {
            data: [1234, 5678],
          },
        })
        .expectData({
          secondProfileData: {
            second: 5678,
          },
        })
        .on(e);
    },
  );

  await t.should("access injected nested context with custom key", async () => {
    await gql`
      query {
        customKey {
          custom
        }
      }
    `
      .withContext({
        profile: {
          "custom key": 123,
        },
      })
      .expectData({
        customKey: {
          custom: 123,
        },
      })
      .on(e);
  });

  await t.should("fail for invalid context", async () => {
    await gql`
      query {
        secondProfileData {
          second
        }
      }
    `
      .withContext({
        profile: {
          "invalid key": 123,
        },
      })
      .expectErrorContains("Property 'data' not found at `<context>.profile`")
      .on(e);
  });

  await t.should("work with missing context on optional type", async () => {
    await gql`
      query {
        optional {
          optional
        }
      }
    `
      .withContext({
        profile: {
          id: 1234,
        },
      })
      .expectData({
        optional: {
          optional: null,
        },
      })
      .on(e);
  });
});
