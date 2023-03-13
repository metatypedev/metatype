// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, recreateMigrations, test } from "../utils.ts";

test("1:n relationships", async (t) => {
  const tgPath = "prisma/self_relationship.py";
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

  await t.should("insert an isolated node", async () => {
    await gql`
      mutation q {
        createNode(data: { name: "One" }) {
          name
        }
      }
    `
      .expectData({
        createNode: { name: "One" },
      })
      .on(e);
  });

  await t.should("append a node", async () => {
    await gql`
      mutation q {
        createNode(data: {
          name: "Two",
          prev: {
            connect: {
              name: "One"
            }
          }
        }) {
          name
        }
      }
    `
      .expectData({
        createNode: {
          name: "Two",
        },
      })
      .on(e);
  });

  await t.should("insert a list", async () => {
    // This does not work!
    // Should this work??

    // await gql`
    //   mutation q {
    //     createNode(data: {
    //       name: "First",
    //       next: {
    //         create: {
    //           name: "Second",
    //           next: {
    //             create: {
    //               name: "Third"
    //             }
    //           }
    //         }
    //       }
    //     }) {
    //       name
    //       next {
    //         name
    //       }
    //     }
    //   }
    //   `
    //   .expectData({
    //     createNode: {
    //       name: "First",
    //       next: {
    //         name: "Second",
    //       },
    //     },
    //   })
    //   .on(e);

    await gql`
      mutation q {
        createNode(data: {
          name: "First",
          next: {
            create: {
              name: "Second",
            }
          }
        }) {
          name
          next {
            name
          }
        }
      }
      `
      .expectData({
        createNode: {
          name: "First",
          next: {
            name: "Second",
          },
        },
      })
      .on(e);
  });

  // TODO: enable; after implementation of "Full prisma mapping"
  // t.should("find first nodes", async () => {
  //   await gql`
  //     query q {
  //       findNode(where: {
  //         prev: { is: null }
  //       }) {
  //         name
  //       }
  //     }
  //   `
  //     .expectData({
  //       findNode: [{
  //         name: "One",
  //       }, {
  //         name: "First",
  //       }],
  //     })
  //     .on(e);
  // });
});
