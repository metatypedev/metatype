// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../../../src/engine/query_engine.ts";
import { randomPGConnStr } from "../../utils/database.ts";
import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

const PYTHON_TG_PATH = "runtimes/graphql/typegraphs/python/graphql.py";
const TS_TG_PATH = "runtimes/graphql/typegraphs/deno/graphql.ts";

Meta.test("Typegraph generation with GraphQL runtime", async (t) => {
  await t.assertSameTypegraphs(
    TS_TG_PATH,
    PYTHON_TG_PATH,
  );
});

async function testEngine(engine: QueryEngine) {
  // get users
  await gql`
    {
      users {
        data {
          id
          name
        }
      }
    }
  `
    .expectData({
      users: {
        data: [
          {
            id: "1",
            name: "Leanne Graham",
          },
          {
            id: "2",
            name: "Ervin Howell",
          },
          {
            id: "3",
            name: "Clementine Bauch",
          },
          {
            id: "4",
            name: "Patricia Lebsack",
          },
          {
            id: "5",
            name: "Chelsey Dietrich",
          },
          {
            id: "6",
            name: "Mrs. Dennis Schulist",
          },
          {
            id: "7",
            name: "Kurtis Weissnat",
          },
          {
            id: "8",
            name: "Nicholas Runolfsdottir V",
          },
          {
            id: "9",
            name: "Glenna Reichert",
          },
          {
            id: "10",
            name: "Clementina DuBuque",
          },
        ],
      },
    })
    .on(engine);

  // get user
  await gql`
    {
      user(id: "1") {
        id
        name
      }
    }
  `
    .expectData({
      user: {
        id: "1",
        name: "Leanne Graham",
      },
    })
    .on(engine);

  // Mutation
  await gql`
    mutation {
      create_message(data: { title: "Hey", user_id: "1" }) {
        id
        title
        user_id
      }
    }
  `
    .expectData({
      create_message: {
        id: 1,
        title: "Hey",
        user_id: "1",
      },
    })
    .on(engine);

  // TODO: Fails because metatype type system is not recognized by outside APIs
  // await gql`
  //   mutation CreateUser($name: String!, $username: String!, $email: String!) {
  //     create_user (input: {
  //       name: $name,
  //       username: $username
  //       email: $email
  //     }) {
  //       id
  //       name
  //     }
  //   }
  // `.withVars({
  //   name: "John",
  //   username: "Johhn",
  //   email: "John@gmail.com"
  // })
  // .expectData({
  //   create_user: {
  //     data: {
  //       createUser: {
  //         id: "11",
  //         name: "John",
  //       },
  //     },
  //   },
  // }).on(engine);

  await gql`
    {
      messages(take: 4) {
        id
        title
        user_id
        user {
          id
          name
        }
      }
    }
  `
    .expectData({
      messages: [
        {
          id: 1,
          title: "Hey",
          user_id: "1",
          user: {
            id: "1",
            name: "Leanne Graham",
          },
        },
      ],
    })
    .on(engine);
}

Meta.test(
  {
    name: "GraphQL Runtime: Python SDK",
  },
  async (t) => {
    const { connStr, schema: _ } = randomPGConnStr();
    const engine = await t.engine(PYTHON_TG_PATH, {
      secrets: {
        POSTGRES: connStr,
      },
    });
    await dropSchemas(engine);
    await recreateMigrations(engine);

    await t.should(
      "work when fetching data using GraphQL Runtime",
      async () => {
        await testEngine(engine);
      },
    );
  },
);

// Meta.test(
//   {
//     name: "GraphQL Runtime: TS SDK",
//   },
//   async (t) => {
//     const { connStr, schema: _ } = randomPGConnStr();
//     const engine = await t.engine(TS_TG_PATH, {
//       secrets: {
//         POSTGRES: connStr,
//       },
//     });
//     await dropSchemas(engine);
//     await recreateMigrations(engine);

//     await t.should(
//       "work when fetching data through graphql request",
//       async () => {
//         await testEngine(engine);
//       },
//     );
//   },
// );
