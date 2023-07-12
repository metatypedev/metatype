// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { recreateMigrations } from "../utils/migrations.ts";
import { gql, Meta } from "../utils/mod.ts";

Meta.test("Typename", async (t) => {
  const e = await t.pythonFile("typename/typename.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=typename",
    },
  });

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

Meta.test("Typename in deno runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=typename",
    },
  });

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

Meta.test("Typename in random runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=typename",
    },
  });

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

Meta.test("Typename in prisma runtime", async (t) => {
  const e = await t.pythonFile("typename/typename.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=typename",
    },
  });

  await gql`
      mutation a {
        dropSchema
      }
    `
    .expectData({ dropSchema: 0 })
    .on(e);
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
