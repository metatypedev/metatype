// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

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
      .withHeaders({
        "Authorization": `Basic ${btoa("admin:password")}`,
      })
      .on(e);
  });
}, {
  systemTypegraphs: true,
});
