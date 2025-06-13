// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";
import * as mf from "test/mock_fetch";
import { buildSchema, graphql } from "graphql";
import { withInlinedVars } from "@metatype/typegate/runtimes/utils/graphql_inline_vars.ts";
import { assertEquals } from "@std/assert";
import outdent from "outdent";
import { assertNotEquals } from "@std/assert/not-equals";

const schema = buildSchema(`
  type User {
    id: Int!
    name: String!
    email: String!
  }
  input UserUpdate {
    name: String
    email: String
  }

  type Query {
    user(id: Int!): User
    randInt: Int
  }
  type Mutation {
    updateUser(id: Int!, patch: UserUpdate!): User
  }
`);

function generateUser(id: number) {
  return {
    id,
    email: `user.${id}@example.com`,
    name: `User ${id}`,
  };
}

const rootValue = {
  user: ({ id }: { id: number }) => {
    return generateUser(id);
  },
  updateUser: ({
    id,
    patch,
  }: {
    id: number;
    patch: { name?: string; email?: string };
  }) => {
    return { ...generateUser(id), ...patch };
  },
  randInt: () => {
    return Math.floor(Math.random() * 10000);
  },
};

mf.install();

mf.mock("POST@/api/graphql", async (req) => {
  const { query, variables } = await req.json();
  const res = await graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables,
  });
  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

Meta.test("GraphQL queries", async (t) => {
  const e = await t.engine("graphql/graphql.py");

  await t.should("work with queries", async () => {
    await gql`
      query {
        user(id: 12) {
          id
          name
          email
        }
      }
    `
      .expectData({
        user: generateUser(12),
      })
      .on(e);
  });
});

Meta.test("GraphQL variables", async (t) => {
  const e = await t.engine("graphql/graphql.py");

  await t.should("work", async () => {
    await gql`
      query GetUser($id: Int!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `
      .withVars({
        id: 15,
      })
      .expectData({
        user: generateUser(15),
      })
      .on(e);
  });

  await t.should("work with nested variables", async () => {
    await gql`
      mutation PatchUser($id: Int!, $name: String) {
        updateUser(id: $id, patch: { name: $name }) {
          id
          name
          email
        }
      }
    `
      .withVars({
        id: 15,
        name: "John",
      })
      .expectData({
        updateUser: { ...generateUser(15), name: "John" },
      })
      .on(e);
  });
});

Meta.test("GraphQL: variable inlining", async (t) => {
  await t.should("work", () => {
    const getQuery = withInlinedVars(
      outdent`
      query CreatePerson($name: String!, $age: Int!, $parents: [ID!]!, $address: Address!) {
        createPerson(name: $name, age: $age, parents: $parents, address: $address) {
          id
        }
      }
    `,
      ["name", "age", "parents", "address"],
    );
    const query = getQuery({
      name: "John Doe",
      age: 21,
      parents: ["123456789", "987654321"],
      address: { city: "Paris", country: "France" },
    });
    assertEquals(
      query,
      outdent`
        query CreatePerson {
          createPerson(
            name: "John Doe"
            age: 21
            parents: ["123456789", "987654321"]
            address: { city: "Paris", country: "France" }
          ) {
            id
          }
        }`,
    );
  });
});

Meta.test("GraphQL request idempotency", async (t) => {
  const e = await t.engine("graphql/graphql.py");
  const requestKeys = ["one", "one", "two", "", " ", "   ", "one", "two"];
  const seen = new Map<string, number>();

  await t.should("work", async () => {
    for (const key of requestKeys) {
      await gql`query GetRandInt { randInt }`
        .withHeaders({
          "Idempotency-Key": key,
        })
        .expectBody((body) => {
          const value = body?.data?.randInt as number;
          // Note:
          // JS automatically trims the headers

          if (seen.has(key)) {
            const cached = seen.get(key);
            if (key.trim() !== "") {
              assertEquals(cached, value);
            } else {
              // empty string should be equal to no header
              assertNotEquals(cached, value);
            }
          } else {
            seen.set(key, value);
          }
        })
        .on(e);
    }
  });

  await t.should(
    "fail when reusing a known key on a different request",
    async () => {
      for (const key of requestKeys) {
        const query = gql`query GetRandIntHasChanged1234 { randInt }`;

        if (key.trim() !== "") {
          await query.withHeaders({
            "Idempotency-Key": key,
          })
            .expectStatus(422)
            .on(e);
        } else {
          await query.withHeaders({
            "Idempotency-Key": key,
          })
            .expectStatus(200)
            .on(e);
        }
      }
    },
  );
});
