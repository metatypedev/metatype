// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";
import { dropSchema, randomPGConnStr } from "test-utils/database.ts";
import { gql, Meta } from "test-utils/mod.ts";
import type { MetaTest } from "test-utils/test.ts";

async function runCommonTestSteps(t: MetaTest, e: QueryEngine) {
  await t.should("create a record with a nested object", async () => {
    await gql`
      mutation {
        createUser(data: { id: 12, profile: { create: { id: 15 } } }) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 12,
        },
      })
      .on(e);

    await gql`
      query {
        findUniqueProfile(where: { id: 15 }) {
          id
          user {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueProfile: {
          id: 15,
          user: {
            id: 12,
          },
        },
      })
      .on(e);
  });
}

Meta.test("required 1-1 relationships", async (t) => {
  const typegraphs = [
    { file: "runtimes/prisma/normal_1_1.py", frontendName: "python" },
    { file: "runtimes/prisma/normal_1_1.ts", frontendName: "deno" },
  ];

  for (const tg of typegraphs) {
    const { connStr, schema } = randomPGConnStr();
    await dropSchema(schema);
    const e = await t.engine(tg.file, {
      secrets: {
        POSTGRES: connStr,
      },
    });

    await runCommonTestSteps(t, e);

    await t.should(
      `delete fails with nested object (${tg.frontendName})`,
      async () => {
        await gql`
        mutation {
          deleteUser(where: { id: 12 }) {
            id
          }
        }
      `
          .expectErrorContains("Foreign key constraint violated")
          .on(e);
      },
    );
  }
});

Meta.test("optional 1-1 relationships", async (t) => {
  await dropSchema("prisma-1-1");
  const e = await t.engine("runtimes/prisma/optional_1_1.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-1-1",
    },
  });

  await runCommonTestSteps(t, e);

  // onDelete defaults to SetNull
  await t.should("delete row referenced by another row", async () => {
    await gql`
      mutation {
        deleteUser(where: { id: 12 }) {
          id
        }
      }
    `
      .expectData({
        deleteUser: {
          id: 12,
        },
      })
      .on(e);

    await gql`
      query {
        findUniqueProfile(where: {id: 15}) {
          id
          user {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueProfile: {
          id: 15,
          user: null,
        },
      })
      .on(e);
  });
});
