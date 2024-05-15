// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals } from "std/assert/mod.ts";
import { PrismaRuntime } from "../../../src/runtimes/prisma/prisma.ts";
import { gql, Meta } from "../../utils/mod.ts";
import { randomSchema } from "../../utils/database.ts";

Meta.test("prisma query builder", async (t) => {
  const schema = randomSchema();
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES:
        `postgresql://postgres:password@localhost:5432/db?schema=${schema}`,
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
  });
});
