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
    const id = "b7831fd1-799d-4b20-9a84-830588f750a1";
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
        createUser(
          data: {
            id: ${id}
            name: "name"
            email: "email@example.com"
            messages: {
              create: {
                id: 123
                time: 12345
                message: "Hello, Jack!"
              }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: { id },
      })
      .on(e);

    await gql`
      query {
        findUniqueUser(where: { id: ${id} }) {
          id
          name
          email
          messages {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueUser: {
          id,
          name: "name",
          email: "email@example.com",
          messages: [{ id: 123 }],
        },
      })
      .on(e);
  });
});
