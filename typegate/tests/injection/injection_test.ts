// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, gql, recreateMigrations, test } from "../utils.ts";
import { assertRejects } from "std/testing/asserts.ts";
import { buildSchema, graphql } from "graphql";
import * as mf from "test/mock_fetch";

test("Missing env var", async (t) => {
  await assertRejects(
    () => t.pythonFile("injection/injection.py"),
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

const TG_INJECTION_POSTGRES =
  "postgresql://postgres:password@localhost:5432/db?schema=prisma";

test("Injected values", async (t) => {
  const e = await t.pythonFile("injection/injection.py", {
    secrets: { TG_INJECTION_TEST_VAR: "3", TG_INJECTION_POSTGRES },
  });

  await t.should("fail for missing context", async () => {
    await gql`
    query {
      test(a: 1) {
        raw_int
      }
    }
    `
      .expectErrorContains("'userId' was not found in the context")
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
        effect_none { operation }
      }
    `
      .expectData({
        effect_none: { operation: "read" },
      })
      .on(e);
    await gql`
      mutation {
        effect_create { operation }
        effect_delete { operation }
        effect_update { operation }
      }
    `
      .expectData({
        effect_create: { operation: "insert" },
        effect_delete: { operation: "remove" },
        effect_update: { operation: "modify" },
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

test("Injection from/into graphql", async (t) => {
  const e = await t.pythonFile("injection/injection.py", {
    secrets: { TG_INJECTION_TEST_VAR: "3", TG_INJECTION_POSTGRES },
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
            id text senderId recipientId
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
