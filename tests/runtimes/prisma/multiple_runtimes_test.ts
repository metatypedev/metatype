// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("prisma", async (t) => {
  const tgPath = "runtimes/prisma/multiple_runtimes.py";
  const e = await t.engine(tgPath, {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-multi-a",
      POSTGRES_2:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-multi-b",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

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
