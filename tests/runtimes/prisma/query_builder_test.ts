// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { assertEquals } from "@std/assert";
import { PrismaRuntime } from "@metatype/typegate/runtimes/prisma/prisma.ts";
import { gql, Meta } from "test-utils/mod.ts";
import { dropSchema, randomPGConnStr } from "test-utils/database.ts";

Meta.test("prisma query builder", async (t) => {
  const { connStr, schema } = randomPGConnStr();
  await dropSchema(schema);
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES: connStr,
    },
  });
  const plan = await gql`
    query {
      findUniqueUser(where: { id: 12 }) {
        id
        identities {
          identifier
          provider
        }
        email
        name
        messages {
          id
          time
          message
        }
      }
    }
  `.planOn(e);

  const runtime = plan.stages[0].props.runtime as PrismaRuntime;
  const [gen] = runtime.buildQuery(plan.stages);
  const query = gen({
    variables: {},
    context: {},
    effect: null,
    parent: {},
  });

  assertEquals(query, {
    batch: [
      // FIXME: this test uses the stages from the initial plan
      // which wilil include the polymorphic batch stage (which is then included
      // in a concrete batch stage when we genereate again)
      {
          action: "batch",
          modelName: undefined,
          query: {
            arguments: {
             context: {},
             parent: {},
             variables: {},
           },
           selection: {},
         },
       },
    {
      modelName: "users",
      action: "findUnique",
      query: {
        selection: {
          id: true,
          identities: {
            selection: {
              identifier: true,
              provider: true,
            },
          },
          email: true,
          name: true,
          messages: {
            selection: {
              id: true,
              time: true,
              message: true,
            },
          },
        },
        arguments: {
          where: {
            id: 12,
          },
        },
      },
    }
  ]
  });
});
