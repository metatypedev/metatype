import { gql, shell, test } from "./utils.ts";

test("prisma", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/prisma.py");

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);
    await shell(["../typegraph/.venv/bin/meta", "prisma", "apply"]);
  });

  await t.should("return no data when empty", async () => {
    await gql`
      query {
        findManyrecord {
          id
        }
      }
    `
      .expectData({
        findManyrecord: [],
      })
      .on(e);
  });

  await t.should("insert a simple record", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750a1";
    await gql`
      mutation {
        createOnerecord(
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
        createOnerecord: { id },
      })
      .on(e);
  });

  await t.should("update a simple record", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750a2";
    await gql`
      mutation {
        createOnerecord(
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
        createOnerecord: { id },
      })
      .on(e);

    await gql`
      mutation {
        updateOnerecord(
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
        updateOnerecord: { id, name: "name2" },
      })
      .on(e);
  });

  await t.should("delete a simple record", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750a3";
    await gql`
      mutation {
        createOnerecord(
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
        createOnerecord: { id },
      })
      .on(e);
    await gql`
      mutation {
        deleteOnerecord(
          where: {
            id: ${id}
          } 
        ) {
          id
        }
      }
    `
      .expectData({
        deleteOnerecord: { id },
      })
      .on(e);
  });

  await t.should("refuse to insert if not unique", async () => {
    const id = "b7831fd1-799d-4b20-9a84-830588f750ae";
    const q = gql`
    mutation {
      createOnerecord(
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
        createOnerecord: { id },
      })
      .on(e);

    await q
      .expectErrorContains("Unique constraint failed on the fields: (`id`)")
      .on(e);
  });
});

test("1:n relationships", async (t) => {
  const e = await t.pythonFile("./tests/typegraphs/prisma.py");

  await t.should("drop schema and recreate", async () => {
    await gql`
      mutation a {
        executeRaw(
          query: "DROP SCHEMA IF EXISTS test CASCADE"
          parameters: "[]"
        )
      }
    `
      .expectData({
        executeRaw: 0,
      })
      .on(e);
    await shell(["../typegraph/.venv/bin/meta", "prisma", "apply"]);
  });

  await t.should("insert a simple record", async () => {
    const id = 12;
    await gql`
      mutation q {
        createOneusers(
          data: {
            id: ${id}
            name: "name"
            email: "email@example.com"
          }
        ) {
          id
          messages {
            id
            time
            message
          }
        }
      }
    `
      .expectData({
        createOneusers: { id, messages: [] },
      })
      .on(e);
  });
});
