import { v4 } from "std/uuid/mod.ts";
import { assert } from "std/testing/asserts.ts";
import { gql, meta, test } from "./utils.ts";

test("prisma", async (t) => {
  const tgPath = "typegraphs/prisma.py";
  const e = await t.pythonFile(tgPath);

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
    await meta("prisma", "apply", "-f", tgPath);
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
      .withExpect(({ data }) => {
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

test("1:n relationships", async (t) => {
  const tgPath = "typegraphs/prisma.py";
  const e = await t.pythonFile(tgPath);

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
    await meta("prisma", "apply", "-f", tgPath);
  });

  await t.should("insert a record with nested object", async () => {
    await gql`
      mutation q {
        createUser(
          data: {
            name: "name"
            email: "email@example.com"
            messages: {
              create: { id: 123, time: 12345, message: "Hello, Jack!" }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: { id: 1 },
      })
      .on(e);

    await gql`
      query {
        findUniqueUser(where: { id: 1 }) {
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
          id: 1,
          name: "name",
          email: "email@example.com",
          messages: [{ id: 123 }],
        },
      })
      .on(e);

    await gql`
      mutation {
        createUser(
          data: {
            id: 14
            name: "User 14"
            email: "user14@example.com"
            messages: {
              createMany: {
                data: [
                  { id: 234, time: 23456, message: "Hi" }
                  { id: 235, time: 23467, message: "Are you OK?" }
                ]
              }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 14,
        },
      })
      .on(e);

    await gql`
      query {
        findMessages(where: { sender: { id: 14 } }) {
          id
          time
          message
        }
      }
    `
      .expectData({
        findMessages: [
          { id: 234, time: 23456, message: "Hi" },
          { id: 235, time: 23467, message: "Are you OK?" },
        ],
      })
      .on(e);

    await gql`
      mutation {
        deleteMessages(where: { sender: { id: 14 } }) {
          count
        }
      }
    `
      .expectData({
        deleteMessages: {
          count: 2,
        },
      })
      .on(e);
  });

  await gql`
    mutation {
      updateUser(
        where: { id: 14 }
        data: { messages: { create: { id: 345, message: "Hi", time: 34567 } } }
      ) {
        messages {
          id
        }
      }
    }
  `
    .expectData({
      updateUser: {
        messages: [{ id: 345 }],
      },
    })
    .on(e);
});

test("1:1 relationships", async (t) => {
  const tgPath = "typegraphs/prisma_1_1.py";
  const e = await t.pythonFile(tgPath);

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
    await meta("prisma", "apply", "-f", tgPath);
  });

  await t.should("create a record with a nested object", async () => {
    await gql`
      mutation {
        createUser(data: { id: 12, profile: { create: { id: 15 } } }) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 12,
        },
      })
      .on(e);

    await gql`
      query {
        findUniqueProfile(where: { id: 15 }) {
          id
          user {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueProfile: {
          id: 15,
          user: {
            id: 12,
          },
        },
      })
      .on(e);
  });

  await t.should("delete fails with nested object", async () => {
    await gql`
      mutation {
        deleteUser(where: { id: 12 }) {
          id
        }
      }
    `
      .expectErrorContains("Foreign key constraint failed")
      .on(e);
  });
});

test("multiple relationships", async (t) => {
  const tgPath = "typegraphs/prisma_multi.py";
  const e = await t.pythonFile(tgPath);

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
    await meta("prisma", "apply", "-f", tgPath);
  });

  await t.should("insert a simple record", async () => {
    await gql`
      mutation q {
        createUser(data: { id: 12, name: "name", email: "email@example.com" }) {
          id
        }
      }
    `
      .expectData({
        createUser: { id: 12 },
      })
      .on(e);

    await gql`
      query {
        findUniqueUser(where: { id: 12 }) {
          id
          name
          email
          sentMessages {
            id
          }
          receivedMessages {
            id
          }
        }
      }
    `
      .expectData({
        findUniqueUser: {
          id: 12,
          name: "name",
          email: "email@example.com",
          sentMessages: [],
          receivedMessages: [],
        },
      })
      .on(e);
  });

  await t.should("create many nested fields", async () => {
    await gql`
      mutation {
        createUser(
          data: {
            id: 15
            name: "User 15"
            email: "user15@example.com"
            sentMessages: {
              create: {
                id: 234
                time: 23456
                message: "Hi"
                recipient: { connect: { id: 12 } }
              }
              # createMany: {
              #   data: [
              #     {
              #       id: 234
              #       time: 23456
              #       message: "Hi"
              #       # recipientId: 12
              #     },
              #     {
              #       id: 235
              #       time: 23467
              #       message: "Are you OK?"
              #       # recipientId: 12
              #     }
              #   ]
              # }
            }
          }
        ) {
          id
        }
      }
    `
      .expectData({
        createUser: {
          id: 15,
        },
      })
      .on(e);

    await gql`
      query {
        findMessages(where: { sender: { id: 15 } }) {
          id
          time
          message
        }
      }
    `
      .expectData({
        findMessages: [
          { id: 234, time: 23456, message: "Hi" },
          // { id: 235, time: 23467, message: "Are you OK?" },
        ],
      })
      .on(e);

    await gql`
      mutation {
        deleteMessages(where: { sender: { id: 15 } }) {
          count
        }
      }
    `
      .expectData({
        deleteMessages: {
          count: 1,
        },
      })
      .on(e);
  });

  await gql`
    mutation {
      updateUser(
        where: { id: 15 }
        data: {
          sentMessages: {
            create: {
              id: 345
              message: "Hi"
              time: 34567
              recipient: { connect: { id: 12 } }
            }
          }
        }
      ) {
        sentMessages {
          id
        }
      }
    }
  `
    .expectData({
      updateUser: {
        sentMessages: [{ id: 345 }],
      },
    })
    .on(e);
});

test("GraphQL variables", async (t) => {
  const tgPath = "typegraphs/prisma.py";
  const e = await t.pythonFile(tgPath);

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
    await meta("prisma", "apply", "-f", tgPath);
  });

  await t.should("work with top-level variables", async () => {
    await gql`
      mutation CreateRecord($data: recordCreateInput!) {
        createOneRecord(data: $data) {
          id
        }
      }
    `
      .withVars({
        data: {
          name: "name",
          age: 25,
        },
      })
      .withExpect(({ data }) => {
        assert(v4.validate(data.createOneRecord.id));
      })
      .on(e);
  });

  await t.should("work with nested variables", async () => {
    await gql`
      mutation CreateRecord($name: String!, $age: Int!) {
        createOneRecord(data: { name: $name, age: $age }) {
          id
        }
      }
    `.withVars({
      name: "name",
      age: 25,
    })
      .withExpect(({ data }) => {
        assert(v4.validate(data.createOneRecord.id));
      })
      .on(e);
  });
});
