// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals } from "std/assert/mod.ts";
import { PrismaRuntime } from "../../../src/runtimes/prisma/prisma.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("prisma query builder", async (t) => {
  const e = await t.engine("runtimes/prisma/prisma.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma",
    },
  });
  const plan = await gql`
    query {
      findUniqueUser(where: { id: 12 }) {
        id
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
