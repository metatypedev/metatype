// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("prisma critical edgecases", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma_edgecases.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-edgecases",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  // create test data
  await t.should("insert a record with nested object", async () => {
    await gql`
      mutation q {
        createOneUser (
          data: {
            pseudo: "",
            firstname: "John",
            email: "john@doe.com"
          }
        ) 
        {
          id
        }
      }
    `.expectData({
      createOneUser: { id: 1 },
    })
      .on(e);
  });

  await t.should(
    "findUnique with `unique` field that has an empty string value",
    async () => {
      await gql`
      query q {
        findUniqueUser (
          # pseudo is 'unique'
          where: { pseudo: "" }
        )
        {
          id
          pseudo
          firstname
          email
        }
      }
    `.expectData({
        findUniqueUser: {
          id: 1,
          pseudo: "",
          firstname: "John",
          email: "john@doe.com",
        },
      })
        .on(e);
    },
  );

  await t.should("not allow non-unique/id fields", async () => {
    await gql`
      query q {
        findUniqueUser (
          # firstname is neither unique nor id
          where: { firstname: "" }
        )
        {
          id
        }
      }
    `.expectErrorContains("Expected a minimum of 1 fields of (id, pseudo)")
      .on(e);
  });
});
