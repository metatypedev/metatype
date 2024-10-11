// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

const adminHeaders = {
  "Authorization": `Basic ${btoa("admin:password")}`,
};

Meta.test({
  name: "typegate: find available operations",
}, async (t) => {
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
            as_id
            type {
              optional
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

  await t.should("run a custom create query", async () => {
    await gql`
      mutation ExecuteRawPrismaCreate(
        $typegraph: String!,
        $runtime: String!,
        $query: String!
      ) {
        execRawPrismaCreate(
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
          action: "createOne",
          query: JSON.stringify({
            selection: {
              id: true,
              name: true,
              email: true,
            },
            arguments: {
              data: {
                name: "John Doe",
                email: "john.doe@example.com",
              },
            },
          }),
        },
      })
      .withHeaders(adminHeaders)
      .expectData({
        execRawPrismaCreate: JSON.stringify({
          id: 1,
          name: "John Doe",
          email: "john.doe@example.com",
        }),
      })
      .on(e);
  });

  await t.should("run multiple queries in a transaction", async () => {
    await gql`
      mutation ExecuteRawPrismaCreate(
        $typegraph: String!,
        $runtime: String!,
        $query: String!
      ) {
        execRawPrismaCreate(
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
          batch: [
            {
              modelName: "users",
              action: "createOne",
              query: JSON.stringify({
                selection: {
                  id: true,
                  name: true,
                  email: true,
                },
                arguments: {
                  data: {
                    name: "John Doe",
                    email: "john.doe@example.com",
                  },
                },
              }),
            },
            {
              modelName: "users",
              action: "deleteOne",
              query: JSON.stringify({
                selection: {
                  id: true,
                  name: true,
                  email: true,
                },
                arguments: {
                  where: {
                    id: 2,
                  },
                },
              }),
            },
          ],
          transaction: {
            isolationLevel: "serializable",
          },
        },
      })
      .withHeaders(adminHeaders)
      .expectData({
        execRawPrismaCreate: JSON.stringify([
          {
            id: 2,
            name: "John Doe",
            email: "john.doe@example.com",
          },
          {
            id: 2,
            name: "John Doe",
            email: "john.doe@example.com",
          },
        ]),
      })
      .on(e);
  });

  await t.should("query prisma model", async () => {
    await gql`
      query QueryPrismaModel($typegraph: String!, $runtime: String!, $model: String!) {
        queryPrismaModel(
          typegraph: $typegraph,
          runtime: $runtime,
          model: $model,
          offset: 0,
          limit: 50,
        ) {
          fields {
            name
            as_id
          }
          rowCount
          data
        }
      }
    `
      .withVars({
        typegraph: "prisma",
        runtime: "prisma",
        model: "users",
      })
      .withHeaders(adminHeaders)
      .expectData({
        queryPrismaModel: {
          fields: [
            {
              name: "id",
              as_id: true,
            },
            {
              name: "identities",
              as_id: false,
            },
            {
              name: "email",
              as_id: false,
            },
            {
              name: "name",
              as_id: false,
            },
            {
              name: "messages",
              as_id: false,
            },
          ],
          rowCount: 1,
          data: [
            JSON.stringify({
              id: 1,
              email: "john.doe@example.com",
              name: "John Doe",
            }),
          ],
        },
      })
      .on(e);
  });
});
