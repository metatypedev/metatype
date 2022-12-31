// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("Typename", async (t) => {
  const e = await t.pythonFile("typename/typename.py");

  await t.should("allow querying typename at root level", async () => {
    await gql`
      query {
        __typename
      }
    `
      .expectData({
        __typename: "Query",
      })
      .on(e);
  });
});

test("Typename in deno runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py");

  await t.should("allow querying typename in an object", async () => {
    await gql`
      query {
        denoUser {
          __typename
        }
      }
    `
      .expectData({
        denoUser: {
          __typename: "user",
        },
      })
      .on(e);
  });
});

test("Typename in random runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py");

  await t.should("allow querying typename in an object", async () => {
    await gql`
      query {
        randomUser {
          __typename
        }
      }
    `
      .expectData({
        randomUser: {
          __typename: "user",
        },
      })
      .on(e);
  });
});

test("Typename in prisma runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py");

  function sql(q: string, res: any = 0) {
    return gql`
      mutation a($sql: String) {
        executeRaw(
          query: $sql
          parameters: "[]"
        )
      }
    `
      .withVars({ sql: q })
      .expectData({ executeRaw: res });
  }

  await sql("DROP SCHEMA IF EXISTS test CASCADE").on(e);
  await recreateMigrations(e);

  await t.should("allow querying typename in an object", async () => {
    await gql`
      mutation {
        createUser (data: {
            id: 1
          }) {
          __typename
          id
        }
      }
    `
      .expectData({
        createUser: {
          __typename: "userprismaCreateOutput",
          id: 1,
        },
      })
      .on(e);
  });
});
