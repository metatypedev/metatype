// Copyright Metatype under the Elastic License 2.0.

import { gql, meta, test } from "./utils.ts";

test("prisma", async (t) => {
  const tgPath = "typegraphs/multiple_runtimes.py";
  const e = await t.pythonFile(tgPath);

  function sql(q: string, res: any = 0) {
    return gql`
      mutation a($sql: String) {
        executeRaw(
          query: $sql
          parameters: "[]"
        )
      }
    `
      .withVars({ sql: q })
      .expectData({ executeRaw: res });
  }

  await t.should("drop schemas and recreate", async () => {
    await sql("DROP SCHEMA IF EXISTS test CASCADE").on(e);
    await sql("DROP SCHEMA IF EXISTS test2 CASCADE").on(e);
    await meta("prisma", "apply", "-f", tgPath);
  });

  await t.should("succeed queries", async () => {
    await gql`
      mutation {
        createUser1(data: { name: "user" }) {
          id
          name
        }
      }
    `
      .expectData({
        createUser1: {
          id: 1,
          name: "user",
        },
      })
      .on(e);

    await gql`
      query {
        findManyUsers1 {
          id
          name
        }
      }
    `
      .expectData({
        findManyUsers1: [{ id: 1, name: "user" }],
      })
      .on(e);

    await gql`
      query {
        findManyUsers2 {
          id
          name
        }
      }
    `
      .expectData({
        findManyUsers2: [],
      })
      .on(e);
  });
});
