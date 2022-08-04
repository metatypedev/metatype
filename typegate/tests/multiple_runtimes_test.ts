import { assert } from "std/testing/asserts.ts";
import { gql, shell, test } from "./utils.ts";

test("prisma", async (t) => {
  const tgPath = "./tests/typegraphs/multiple_runtimes.py";
  const e = await t.pythonFile(tgPath);

  await t.should("drop schemas and recreate", async () => {
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test1 CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test2 CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);
    await shell([
      "../typegraph/.venv/bin/meta",
      "prisma",
      "apply",
      "-f",
      tgPath,
    ]);
  });

  await t.should("succeed queries", async () => {
    await gql`
      mutation {
        createUser1(data: { name: "user" }) {
          id name
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
          id name
        }
      }
    `
      .expectData({
        findManyUsers1: [
          { id: 1, name: "user" },
        ],
      })
      .on(e);

    await gql`
      query {
        findManyUsers2 {
          id name
        }
      }
    `
      .expectData({
        findManyUsers2: [],
      })
      .on(e);
  });
});
