// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("typegate: list queries", async (t) => {
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

  await t.should("list queries", async () => {
    await gql`
      fragment TermOutput on ArgInfoOut {
        optional
        as_id
        title
        type
        enum
        runtime
        config
        default
        format
      }

      fragment Output on ArgInfoOut {
        ...TermOutput
        fields {
          subPath
          termNode {
            ...TermOutput
          }
        }
      }

      query {
        findListQueries(typegraph: "prisma") {
          name
          inputs {
            name
            type {
              ...TermOutput
            }
          }
          output {
            ...Output
          }
          outputItem {
            ...Output
          }
        }
      }
    `
      .withHeaders({
        "Authorization": `Basic ${btoa("admin:password")}`,
      })
      .matchSnapshot(t)
      .on(e);
  });
}, {
  systemTypegraphs: true,
});
