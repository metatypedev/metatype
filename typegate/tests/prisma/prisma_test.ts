// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { gql, recreateMigrations, test } from "../utils.ts";

test("prisma", async (t) => {
  const tgPath = "prisma/prisma.py";
  const e = await t.pythonFile(tgPath);

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        dropSchema
      }
    `
      .expectData({
        dropSchema: 0,
      })
      .on(e);
    await recreateMigrations(e);
  });

  await t.should("return no data when empty", async () => {
    await gql`
      query {
        findManyRecords {
          id
        }
      }
    `
      .expectData({
        findManyRecords: [],
      })
      .on(e);
  });

  await t.should("insert a simple record", async () => {
    await gql`
      mutation {
        createOneRecord(data: { name: "name", age: 1 }) {
          id
        }
      }
    `
      .expectBody(({ data }) => {
        assert(v4.validate(data.createOneRecord.id));
      })
      .on(e);
  });

  await t.should("update a simple record", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750a2";
    await gql`
      mutation {
        createOneRecord(
          data: {
            id: ${id}
            name: "name"
            age: 1
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createOneRecord: { id },
      })
      .on(e);

    await gql`
      mutation {
        updateOneRecord(
          where: {
            id: ${id}
          }
          data: {
            name: "name2"
          }
        ) {
          id
          name
        }
      }
    `
      .expectData({
        updateOneRecord: { id, name: "name2" },
      })
      .on(e);

    await gql`
      query {
        findManyRecords(
          where: { id: ${id} }
        ) {
          id
          name
        }
      }
    `
      .expectData({
        findManyRecords: [
          {
            id,
            name: "name2",
          },
        ],
      })
      .on(e);
  });

  await t.should("delete a simple record", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750a3";
    await gql`
      mutation {
        createOneRecord(
          data: {
            id: ${id}
            name: "name"
            age: 1
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createOneRecord: { id },
      })
      .on(e);
    await gql`
      mutation {
        deleteOneRecord(
          where: {
            id: ${id}
          }
        ) {
          id
        }
      }
    `
      .expectData({
        deleteOneRecord: { id },
      })
      .on(e);
  });

  await t.should("refuse to insert if not unique", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750ae";
    const q = gql`
    mutation {
      createOneRecord(
        data: {
          id: ${id}
          name: "name"
          age: 1
        }
      ) {
        id
      }
    }
  `;
    await q
      .expectData({
        createOneRecord: { id },
      })
      .on(e);

    await q
      .expectErrorContains("Unique constraint failed on the fields: (`id`)")
      .on(e);
  });
});
