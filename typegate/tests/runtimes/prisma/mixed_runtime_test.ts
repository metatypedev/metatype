// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";
import * as mf from "test/mock_fetch";

mf.install();

Meta.test("prisma mixed runtime", async (t) => {
  const e = await t.engine("runtimes/prisma/mixed_runtime.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-mixed",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  await t.should(
    "insert a record without considering fields owned by other runtimes",
    async () => {
      await gql`
        mutation {
          createOneRecord (
            data: {
              id: 1,
              description: "Some description"
            }
          )
        {
          id
          description
        }
      }
    `.expectData({
        createOneRecord: {
          id: 1,
          description: "Some description",
        },
      })
        .on(e);
    },
  );

  await t.should("work with different runtimes", async () => {
    mf.mock("POST@/api", () => {
      mf.reset();
      const res = {
        data: {
          post: {
            id: "1",
            title: "Test",
          },
        },
      };
      return new Response(JSON.stringify(res), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    await gql`
        query {
          findUniqueRecord(where: {
            id: 1
          }) {
            id
            description
            post(id: "1") {
              id
              title
            }
          }
        }
    `.expectData({
      findUniqueRecord: {
        id: 1,
        description: "Some description",
        post: {
          id: "1",
          title: "Test",
        },
      },
    })
      .on(e);
  });

  await t.should(
    "work with more than two runtimes",
    async () => {
      mf.mock("POST@/api", () => {
        mf.reset();
        const res = {
          data: {
            post: {
              id: "1",
              title: "Test",
            },
          },
        };
        return new Response(JSON.stringify(res), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      });

      await gql`
        query {
          findUniqueRecord(where: {
            id: 1
          }) {
            id
            description
            post(id: "1") {
              id
              title
            }
            user {
              name
              age
            }
          }
        }
    `.expectData({
        findUniqueRecord: {
          id: 1,
          description: "Some description",
          post: {
            id: "1",
            title: "Test",
          },
          user: { name: "Landon Glover", age: 62 },
        },
      })
        .on(e);
    },
  );
});
