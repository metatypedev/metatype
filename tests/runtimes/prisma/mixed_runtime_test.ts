// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { dropSchema } from "test-utils/database.ts";
import { gql, Meta } from "test-utils/mod.ts";
import * as mf from "test/mock_fetch";

mf.install();

Meta.test("prisma mixed runtime", async (t) => {
  await dropSchema("prisma-mixed");
  const e = await t.engine("runtimes/prisma/mixed_runtime.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-mixed",
    },
  });

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
          user: { age: 62, name: "Landon Glover" },
        },
      })
        .on(e);
    },
  );
});
