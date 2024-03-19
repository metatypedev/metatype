// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

const adminHeaders = {
  "Authorization": `Basic ${btoa("admin:password")}`,
};

Meta.test("typegate: find available operations", async (t) => {
  const prismaEngine = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/postgres?schema=prisma",
    },
  });

  await dropSchemas(prismaEngine);
  await recreateMigrations(prismaEngine);

  const e = t.getTypegraphEngine("typegate");
  if (e === undefined) {
    throw new Error("typegate engine not found");
  }

  await t.should("list available prisma models", async () => {
    await gql`
      query FindPrismaModels($typegraph: String!) {
        findPrismaModels(typegraph: $typegraph) {
          name
          runtime
          fields {
            name
            type {
              optional
              as_id
              title
              type
              enum
              runtime
              config
              default
              format
              policies
            }
          }
        }
      }
      `
      .withVars({
        typegraph: "prisma",
      })
      .matchSnapshot(t)
      .withHeaders(adminHeaders)
      .on(e);
  });

  await t.should("run a custom read query", async () => {
    await gql`
      query ExecuteRawPrismaRead(
        $typegraph: String!,
        $runtime: String!,
        $query: String!
      ) {
        execRawPrismaRead(
          typegraph: $typegraph,
          runtime: $runtime,
          query: $query
        )
      }
    `
      .withVars({
        typegraph: "prisma",
        runtime: "prisma",
        query: {
          modelName: "users",
          action: "findUnique",
          query: {
            selection: JSON.stringify({
              id: true,
              name: true,
            }),
            arguments: JSON.stringify({
              where: {
                id: 1,
              },
            }),
          },
        },
      })
      .withHeaders(adminHeaders)
      .expectData({
        execRawPrismaRead: "null",
      })
      .on(e);
  });
}, {
  systemTypegraphs: true,
});
