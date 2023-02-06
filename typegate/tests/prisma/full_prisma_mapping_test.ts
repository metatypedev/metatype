// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("prisma", async (t) => {
  const tgPath = "prisma/prisma.py";
  const e = await t.pythonFile(tgPath);

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        dropSchema
      }
    `
      .expectData({
        dropSchema: 0,
      })
      .on(e);
    await recreateMigrations(e);
  });

  await t.should("return no data when empty", async () => {
    await gql`
      query {
        findManyUsers {
          id
        }
      }
    `
      .expectData({
        findManyUsers: [],
      })
      .on(e);
  });
});
