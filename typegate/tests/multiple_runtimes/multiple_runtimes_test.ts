// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, removeMigrations, test } from "../utils.ts";

test("prisma", async (t) => {
  const tgPath = "multiple_runtimes/multiple_runtimes.py";
  const e = await t.pythonFile(tgPath, {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=test",
      TG_PRISMA_POSTGRES_2:
        "postgresql://postgres:password@localhost:5432/db?schema=test2",
    },
  });

  await t.should("drop schemas and recreate", async () => {
    await gql`mutation { dropSchema1 }`
      .expectData({
        dropSchema1: 0,
      }).on(e);
    await gql`mutation { dropSchema2 }`
      .expectData({
        dropSchema2: 0,
      }).on(e);
    await removeMigrations(e);
    await recreateMigrations(e);
  });

  await t.should("succeed queries", async () => {
    await gql`
      mutation {
        createUser1(data: { name: "user" }) {
          id
          name
        }
      }
    `
      .expectData({
        createUser1: {
          id: 1,
          name: "user",
        },
      })
      .on(e);

    await gql`
      query {
        findManyUsers1 {
          id
          name
        }
      }
    `
      .expectData({
        findManyUsers1: [{ id: 1, name: "user" }],
      })
      .on(e);

    await gql`
      query {
        findManyUsers2 {
          id
          name
        }
      }
    `
      .expectData({
        findManyUsers2: [],
      })
      .on(e);
  });
});
