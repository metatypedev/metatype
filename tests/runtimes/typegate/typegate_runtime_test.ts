// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { dropSchema } from "test-utils/database.ts";

Meta.test({
  name: "typegate: find available operations",
}, async (t) => {
  await dropSchema("prisma_rt_test");
  const _prismaEngine = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma_rt_test",
    },
  });

  const e = t.getTypegraphEngine("typegate");
  if (e === undefined) {
    throw new Error("typegate engine not found");
  }

  await t.should("list available operations", async () => {
    await gql`
      fragment TermOutput on TypeInfo {
        optional
        title
        type
        enum
        default
        format
      }

      fragment Output on TypeInfo {
        ...TermOutput
        fields {
          subPath
          termNode {
            ...TermOutput
          }
        }
      }

      query {
        findAvailableOperations(typegraph: "prisma") {
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
});
