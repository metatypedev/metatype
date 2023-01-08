// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";
import * as mf from "test/mock_fetch";
import { buildSchema, graphql } from "graphql";

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
  updateUser: (
    { id, patch }: { id: number; patch: { name?: string; email?: string } },
  ) => {
    return ({ ...generateUser(id), ...patch });
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

test("GraphQL queries", async (t) => {
  const e = await t.pythonFile("graphql/graphql.py");

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

test("GraphQL variables", async (t) => {
  const e = await t.pythonFile("graphql/graphql.py");

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
          id name email
        }
      }
    `.withVars({
      id: 15,
      name: "John",
    })
      .expectData({
        updateUser: { ...generateUser(15), name: "John" },
      })
      .on(e);
  });
});
