// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../../utils/mod.ts";
import { dropSchema, randomPGConnStr } from "test-utils/database.ts";

Meta.test("prisma", async (t) => {
  const { connStr, schema } = randomPGConnStr();
  await dropSchema(schema);
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES: connStr,
    },
  });

  await t.should("validate string types in where", async () => {
    await gql`
      query {
        findRecord(where: { id: "invaliduuid" }) {
          id
        }
      }
    `
      .expectStatus(400)
      .expectErrorContains(
        "string does not statisfy the required format 'uuid'",
      )
      .on(e);
  });
});
