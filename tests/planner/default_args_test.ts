// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dropSchemas, recreateMigrations } from "test-utils/migrations.ts";
import { gql, Meta } from "test-utils/mod.ts";

Meta.test("prisma", async (t) => {
  const e = await t.engine("runtimes/prisma/full_prisma_mapping.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma_default_args",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  await t.should("fail", async () => {
    await gql`
      query CommentedAuthors {
        findCommentersOfCurrentUser {
          id
          name
          age
          city
        }
      }
    `
      .withContext({
        "user_id": 12,
      })
      .expectData({
        findCommentersOfCurrentUser: [],
      })
      .on(e);
  });
});
