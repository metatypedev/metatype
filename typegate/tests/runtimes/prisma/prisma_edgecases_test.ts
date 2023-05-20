// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { dropSchemas, gql, recreateMigrations, test } from "../../utils.ts";

test("prisma critical edgecases", async (t) => {
  const e = await t.pythonFile("runtimes/prisma/prisma_edgecases.py", {
    secrets: {
      TG_PRISMA_POSTGRES:
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
    `.expectErrorContains("Unexpected props 'firstname'")
      .on(e);
  });
});
