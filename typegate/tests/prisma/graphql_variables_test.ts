// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { gql, recreateMigrations, test } from "../utils.ts";

test("GraphQL variables", async (t) => {
  const tgPath = "prisma/prisma.py";
  const e = await t.pythonFile(tgPath, {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=test",
    },
  });

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

  await t.should("work with top-level variables", async () => {
    await gql`
      mutation CreateRecord($data: recordCreateInput!) {
        createOneRecord(data: $data) {
          id
        }
      }
    `
      .withVars({
        data: {
          name: "name",
          age: 25,
        },
      })
      .expectBody(({ data }) => {
        assert(v4.validate(data.createOneRecord.id));
      })
      .on(e);
  });

  await t.should("work with nested variables", async () => {
    await gql`
      mutation CreateRecord($name: String!, $age: Int!) {
        createOneRecord(data: { name: $name, age: $age }) {
          id
        }
      }
    `.withVars({
      name: "name",
      age: 25,
    })
      .expectBody(({ data }) => {
        assert(v4.validate(data.createOneRecord.id));
      })
      .on(e);
  });
});
