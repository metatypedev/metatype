// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { dropSchema, randomPGConnStr } from "test-utils/database.ts";

Meta.test("Random", async (t) => {
  const { connStr, schema } = randomPGConnStr();
  await dropSchema(schema);
  const e = await t.engine("typecheck/type_alias.py", {
    secrets: {
      POSTGRES: connStr,
    },
  });

  await t.should("validate and work with a basic alias", async () => {
    await gql`
      query {
        get_message {
          a: id
          title
          B: user_id
        }
      }
    `
      .expectData({
        get_message: {
          B: 3336617896968192,
          a: -1494798787674112,
          title: "1*ajw]krgDnCzXD*N!Fx",
        },
      })
      .on(e);
  });

  await t.should(
    "validate and work when all nodes have an alias",
    async () => {
      await gql`
      query {
        one: get_message {
          two: id
          three: title
          four: user_id
        }
      }
    `
        .expectData({
          one: {
            four: -6252260489166848,
            three: "(eHAQ*ECr4%5Qwa5T",
            two: -6940119625891840,
          },
        })
        .on(e);
    },
  );

  await t.should("validate and work with non-trivial aliases", async () => {
    await gql`
      query {
        some_alias: get_message {
          some_id: id
          title
        }
        get_message {
          user_id
          info {
            title: label
            content
          }
        }
        some_alias_2: get_message {
          some_title: title
        }
        some_alias_3: get_message {
          some_title: title
        }
      }
    `
      .expectData({
        some_alias: {
          some_id: -4461702699548672,
          title: "3lo*RB)",
        },
        get_message: {
          user_id: 316945098342400,
          info: [
            {
              content: "7nQg2dMG5bQeI8zVf5",
              title: "sw@ON",
            },
            {
              content: "WQnlMI%zJq!R!xk^",
              title: "0fr[dnu8##f",
            },
            {
              content: "sX@eElTSrxh$M",
              title: "^ItqiGoJKy1ap",
            },
          ],
        },
        some_alias_2: {
          some_title: "qloUYOlWLk]3",
        },
        some_alias_3: {
          some_title: "$bNlQ3^cxB",
        },
      })
      .on(e);
  });

  await t.should("validate and work with prisma runtime", async () => {
    await gql`
      mutation {
        user1: create_user(
          data: { id: 123, name: "john", }
          ) {
            user_id: id
            name
            posts {
              title
              content
            }
          }
      }
    `
      .expectData({
        user1: {
          name: "john",
          user_id: 123,
          posts: [],
        },
      })
      .on(e);

    await gql`
      mutation {
        user1: create_user(
          data: {
            id: 124,
            name: "john",
            posts: {
              create: {
                id: 321,
                title: "hello",
                content: "Hello World!",
              }
            }
          }
        ) {
          id
          name
          user_posts: posts {
            post_title: title
            content
          }
        }
      }
    `
      .expectData({
        user1: {
          id: 124,
          name: "john",
          user_posts: [{
            content: "Hello World!",
            post_title: "hello",
          }],
        },
      })
      .on(e);
  });
});
