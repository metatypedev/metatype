// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { dropSchemas, gql, recreateMigrations, test } from "../../utils.ts";

test("GraphQL variables", async (t) => {
  const e = await t.pythonFile("runtimes/prisma/prisma.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-vars",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

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
