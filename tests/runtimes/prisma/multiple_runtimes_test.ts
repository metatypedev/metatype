// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchema } from "test-utils/database.ts";
import { gql, Meta } from "test-utils/mod.ts";

Meta.test("prisma", async (t) => {
  await dropSchema("prisma-multi-a");
  await dropSchema("prisma-multi-b");
  const tgPath = "runtimes/prisma/multiple_runtimes.py";
  const e = await t.engine(tgPath, {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-multi-a",
      POSTGRES_2:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-multi-b",
    },
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
