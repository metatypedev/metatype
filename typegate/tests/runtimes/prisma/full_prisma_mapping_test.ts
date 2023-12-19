// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dropSchemas, recreateMigrations } from "../../utils/migrations.ts";
import { gql, Meta } from "../../utils/mod.ts";

Meta.test("prisma full mapping", async (t) => {
  const e = await t.engine("runtimes/prisma/full_prisma_mapping.py", {
    secrets: {
      POSTGRES:
        "postgresql://postgres:password@localhost:5432/db?schema=prisma-full",
    },
  });

  await dropSchemas(e);
  await recreateMigrations(e);

  // create test data
  await t.should("insert a record with nested object", async () => {
    await gql`
        mutation q {
          createOneUser (
            data: {
              id: 1,
              name: "Jack",
              age: 20,
              coinflips: [false, true, true]
              city: "Anyville",
              posts: {
                createMany: {
                  data: [
                    { id: 10001, title: "Some Title 1", views: 9, likes: 7, published: true },
                    { id: 10002, title: "Some Title 2", views: 6, likes: 3, published: false },
                    { id: 10003, title: "Some Title 3", views: 5, likes: 13, published: true },
                    { id: 10004, title: "Some Title 4", views: 5, likes: 14, published: true },
                    { id: 10005, title: "Some Title 4", views: 2, likes: 7, published: true },
                    { id: 10006, title: "Some Title 5", views: 0, likes: 0, published: false },
                    { id: 10007, title: "Some title", views: 0, likes: 4, published: true },
                    { id: 10008, title: "Yet another", views: 4, likes: 1, published: true },
                  ]
                }
              }
              extended_profile: {
                create: { id: 10111, bio: "Some bio 1" }
              }
            }
          ) 
        {
          id
        }
      }
    `.expectData({
      createOneUser: { id: 1 },
    })
      .on(e);
  });

  await t.should(
    "find first item after a skip starting from a cursor",
    async () => {
      await gql`
        query {
          findFirstPost(
            where: {
              title: { contains: "Title" }
            },
            skip: 1,
            cursor: { id: 10004 },
            orderBy: [ {title: "desc"} ]
          ) {
            id
            title
          }
        }
    `.expectData({
        findFirstPost: {
          id: 10005,
          title: "Some Title 4",
        },
      })
        .on(e);
    },
  );

  await t.should(
    "work with reduce syntax and find the first item",
    async () => {
      await gql`
        query {
          findFirstPostWithReduce {
            id
            title
          }
        }
    `.expectData({
        findFirstPostWithReduce: {
          id: 10007,
          title: "Some title",
        },
      })
        .on(e);
    },
  );

  await t.should("paginate correctly with findManyPosts", async () => {
    await gql`
        query {
          findManyPosts(skip: 1, take: 2) {
            id
            title
          }
        }
    `.expectData({
      findManyPosts: [
        { id: 10002, title: "Some Title 2" },
        { id: 10003, title: "Some Title 3" },
      ],
    })
      .on(e);
  });

  await t.should("orderBy likes and views", async () => {
    await gql`
        query {
          findManyPosts(
            orderBy: [{likes: "desc"}, {views: "asc"}]
          )
          {
            id
            likes
            views
          }
        }
    `.expectData({
      findManyPosts: [
        { id: 10004, likes: 14, views: 5 },
        { id: 10003, likes: 13, views: 5 },
        { id: 10005, likes: 7, views: 2 },
        { id: 10001, likes: 7, views: 9 },
        { id: 10007, likes: 4, views: 0 },
        { id: 10002, likes: 3, views: 6 },
        { id: 10008, likes: 1, views: 4 },
        { id: 10006, likes: 0, views: 0 },
      ],
    })
      .on(e);
  });

  await t.should("do a groupBy with orderBy", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            where: {author: {id: 1}},
            orderBy: [{_sum: {likes: "desc"}}]
          )
          {
            published
            _count { _all }
            _sum { likes views }
          }
        }
    `.expectData({
      groupByPost: [
        {
          published: true,
          _count: { _all: 6 },
          _sum: { likes: 46, views: 25 },
        },
        {
          published: false,
          _count: { _all: 2 },
          _sum: { likes: 3, views: 6 },
        },
      ],
    })
      .on(e);
  });

  await t.should("do a groupBy with a basic having filter", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            having: {
              published: true,
              views: {_max: { gt: 1 }},

              # does nothing, just proves that the validation works
              # Note: fields does not have to be selected in the output
              likes: {_count: {lte: 100000}}
            }
          )
          {
            published
            _max { views likes }
            _sum { views likes }
          }
        }
    `
      .expectData({
        groupByPost: [
          {
            published: true,
            _max: { views: 9, likes: 14 },
            _sum: { views: 25, likes: 46 },
          },
        ],
      })
      .on(e);
  });

  await t.should("do a groupBy with a valid nested having filter", async () => {
    await gql`
        query {
          groupByPost(
            by: ["published"],
            having: {
                AND: [
                  # AND operand 1
                  {
                    OR: [
                      {
                        published: true,
                        views: {_max: { gt: 1 }},
                      },
                      { NOT: { published: {not: false} } },
                      { views: {_count: {in : [-1, -2, -1000]} }}
                    ]
                  },

                  # AND operand 2
                  {
                    views: {_sum: {equals: 25}}
                  }

                  # AND operand 3
                  {
                    id: {_count: {gt: 0}}
                  }
                ]
            }
          )
          {
            published
            _count { _all }
            _max { views likes }
            _sum { views likes }
          }
        }
    `
      .expectData({
        groupByPost: [
          {
            published: true,
            _count: { _all: 6 },
            _max: { views: 9, likes: 14 },
            _sum: { views: 25, likes: 46 },
          },
        ],
      })
      .on(e);
  });

  await t.should("do an aggregate", async () => {
    await gql`
        query {
          aggregatePost(where: {author: {id: 1}}) {
            _count { _all views likes }
            _sum { views likes }
            _max { views likes }
            _min { views likes }
            _avg { views likes }
          }
        }
    `.expectData({
      aggregatePost: {
        _count: { _all: 8, views: 8, likes: 8 },
        _sum: { views: 31, likes: 49 },
        _max: { views: 9, likes: 14 },
        _min: { views: 0, likes: 0 },
        _avg: { views: 3.875, likes: 6.125 },
      },
    })
      .on(e);
  });

  await t.should(
    "aggregate after taking 2 items starting from the second row (skip first row)",
    async () => {
      await gql`
        query {
          aggregatePost(
            where: {author: {id: 1}},
            skip: 1,
            take: 2
          ) {
            _count { _all views likes }
            _sum { views likes }
            _max { views likes }
            _min { views likes }
            _avg { views likes }
          }
        }
      `.expectData({
        aggregatePost: {
          _count: { _all: 2, views: 2, likes: 2 },
          _sum: { views: 11, likes: 16 },
          _max: { views: 6, likes: 13 },
          _min: { views: 5, likes: 3 },
          _avg: { views: 5.5, likes: 8 },
        },
      })
        .on(e);
    },
  );

  await t.should("do a distinct on col `published`", async () => {
    await gql`
        query {
          findManyPosts(distinct: ["published"]) {
            published
          }
        }
    `.expectData({
      findManyPosts: [
        { published: true },
        { published: false },
      ],
    })
      .on(e);
  });

  await t.should(
    "filter with a complex nested query on findManyPosts",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              OR: [
                # OR operand 1
                {
                  AND: [
                    {
                      OR: [
                        {title: {contains: "Title 1"}},
                        {title: {contains: "Title 4"}},
                        # although not affecting the result
                        # not failing means they are accepted by prisma-engine
                        {likes: {in: [6]}},
                        {views: 9}
                      ]
                    },
                    {NOT: {views: {not: {gt: 5}}}},
                  ]
                },

                # OR operand 2
                {views: {lt: 3}},

                # OR operand 3
                {views: {equals: 9}} # or {views: 9}
              ],
            }
          ) {
            id
            title
            views
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10001, title: "Some Title 1", views: 9 },
          { id: 10005, title: "Some Title 4", views: 2 },
          { id: 10006, title: "Some Title 5", views: 0 },
          { id: 10007, title: "Some title", views: 0 },
        ],
      })
        .on(e);
    },
  );

  await t.should(
    "filter with simple nested query on findManyPosts",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              views: {not: {gte: 5}},
              title: {startsWith: "Some"},
              AND: [
                # 0 < likes <= 7
                {likes: {lte: 7}},
                {likes: {gt: 0}}
              ]
            }
          ) {
            id
            title
            views
            likes
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10005, title: "Some Title 4", views: 2, likes: 7 },
          { id: 10007, title: "Some title", views: 0, likes: 4 },
        ],
      })
        .on(e);
    },
  );

  await t.should(
    "not accept nested terminal `not` expressions (=/= `NOT` root expression)",
    async () => {
      await gql`
        query {
          findManyPosts(
            where: {
              # this is not Ok
              # not (lowercase) is a terminal node
              views: {not: {not: {equals: 5}}}
            }
          ) {
            id
            title
          }
        }
    `.expectErrorContains("mismatch")
        .on(e);
    },
  );

  await t.should(
    "accept nested root `NOT` expressions (=/= `not` terminal expression)",
    async () => {
      await gql`
        query {
          findManyPosts (
            where: {
              NOT: {
                NOT: {
                  NOT: {
                    NOT: {
                      NOT: {views: {not: 5}} # equiv. to equals
                    }
                  }
                }
              }
            }
          ) {
            id
            title
            views
          }
        }
    `.expectData({
        findManyPosts: [
          { id: 10003, title: "Some Title 3", views: 5 },
          { id: 10004, title: "Some Title 4", views: 5 },
        ],
      })
        .on(e);
    },
  );

  await t.should("accept nested relationship filters", async () => {
    await gql`
      query {
        findManyPosts (
          where: {
            author: {
              posts: {
                some: {
                  id: 10001
                }
              }
            }
          }
        ) {
          id
          title
        }
      }
   `.expectData({
        findManyPosts: [
          { id: 10001, title: "Some Title 1" },
          { id: 10002, title: "Some Title 2" },
          { id: 10003, title: "Some Title 3" },
          { id: 10004, title: "Some Title 4" },
          { id: 10005, title: "Some Title 4" },
          { id: 10006, title: "Some Title 5" },
          { id: 10007, title: "Some title" },
          { id: 10008, title: "Yet another" },
        ],
      })
      .on(e);

    await gql`
       query {
         findManyPosts (
           where: {
             author: {
               posts: {
                 some: {
                   author: {
                     id: 1
                   }
                 }
               }
             }
           }
         ) {
           id
           title
         }
       }
    `.expectData({
      findManyPosts: [
        { id: 10001, title: "Some Title 1" },
        { id: 10002, title: "Some Title 2" },
        { id: 10003, title: "Some Title 3" },
        { id: 10004, title: "Some Title 4" },
        { id: 10005, title: "Some Title 4" },
        { id: 10006, title: "Some Title 5" },
        { id: 10007, title: "Some title" },
        { id: 10008, title: "Yet another" },
      ],
    })
      .on(e);
  });

  await t.should(
    "update matching rows and return the count affected",
    async () => {
      await gql`
        mutation {
          updateManyPosts(
            where: {published: true},
            data: {
              views: {increment: 3},
              likes: {set: 123},
              published: {set: false},
              title: {set: "TITLE_MODIFIED"}
            }
          ) {
            count
          }
        }
    `.expectData({
        updateManyPosts: {
          count: 6,
        },
      })
        .on(e);
    },
  );

  await t.should(
    "create many users",
    async () => {
      await gql`
        mutation {
          createManyUsers(
            data: [
              { id: 2, name: "Robert", age: 21, coinflips: [false, true], city: "SomeVille" },
              { id: 3, name: "Kiki", age: 18, coinflips: [true], city: "AnotherVille" },
              { id: 4, name: "George", age: 18, coinflips: [false], city: "YetAnotherVille" },
            ]
          ) {
            count
          }
        }
    `.expectData({
        createManyUsers: {
          count: 3,
        },
      })
        .on(e);
    },
  );

  await t.should(
    "update ([up]sert) an existing user",
    async () => {
      await gql`
        mutation {
          upsertOneUser(
            where: {id: 2},
            create: {
              id: 2,
              name: "Robert",
              age: 21,
              coinflips: [false, true],
              city: "SomeVille",
              posts: { createMany: { data: [] } }
            },
            update: {
              name: {set: "New Name"},
              coinflips: {set: [false, false, false]}
            }
          ) {
            id
            name
            age
            coinflips
          }
        }
    `.expectData({
        upsertOneUser: {
          id: 2,
          name: "New Name",
          age: 21,
          coinflips: [false, false, false],
        },
      })
        .on(e);
    },
  );

  await t.should(
    "insert (up[sert]) a non-existing user",
    async () => {
      await gql`
        mutation {
          upsertOneUser(
            where: {id: 1234},
            create: {
              id: 1234,
              name: "Mark",
              age: 22,
              coinflips: [true],
              city: "SomeVille",
              posts: {
                createMany: {
                  data: [
                    { id: 10021, title: "Some Title 21", views: 1, likes: 0, published: true },
                    { id: 10022, title: "Some Title 22", views: 5, likes: 3, published: true },
                  ]
                }
              }
            },
            # should not be applied
            update: {
              name: {set: "New Name"},
            }
          ) {
            id
            name
            age
            coinflips
            posts {
              id
              title
            }
          }
        }
    `.expectData({
        upsertOneUser: {
          id: 1234,
          name: "Mark",
          age: 22,
          coinflips: [true],
          posts: [
            { id: 10021, title: "Some Title 21" },
            { id: 10022, title: "Some Title 22" },
          ],
        },
      })
        .on(e);
    },
  );

  await t.should("create a single test comment", async () => {
    await gql`
        mutation {
          createOneComment(
            data: {
              id: 50001,
              content: "good",
              related_post: { connect: { id: 10001 }},
              author: { connect: { id: 1 } } }
          ) {
            id
            content
          }
        }
    `.expectData({
      createOneComment: {
        id: 50001,
        content: "good",
      },
    })
      .on(e);
  });

  await t.should("filter using nested relation (1-1)", async () => {
    await gql`
        query {
          findFirstComment(
            where: {
              related_post: {
                title: { contains: "MODIFIED" }
              }
            },
          ) {
            id
            related_post {
              id
              title
            }
          }
        }
    `.expectData({
      findFirstComment: {
        id: 50001,
        related_post: {
          id: 10001,
          title: "TITLE_MODIFIED",
        },
      },
    })
      .on(e);
  });

  await t.should("delete extended profile", async () => {
    await gql`
      mutation {
        updateUser(
          where: { id: 1 },
          data: {
            extended_profile: {
              delete: true
            }
          }
        ) {
          id
          extended_profile {
            id
            bio
          }
        }
      }
    `
      .expectData({
        updateUser: {
          id: 1,
          extended_profile: null,
        },
      })
      .on(e);
  });

  await t.should(
    "do a nested count with findUniqueUser",
    async () => {
      await gql`
        query {
          findUniqueUser(where: {id: 1}) {
            id
            name
            age
            _count {
              posts
            }
            posts {
              id
              _count { comments }
            }
          }
        }
    `.expectData({
        findUniqueUser: {
          id: 1,
          name: "Jack",
          age: 20,
          _count: { posts: 8 },
          posts: [
            { id: 10001, _count: { comments: 1 } },
            { id: 10002, _count: { comments: 0 } },
            { id: 10005, _count: { comments: 0 } },
            { id: 10007, _count: { comments: 0 } },
            { id: 10003, _count: { comments: 0 } },
            { id: 10008, _count: { comments: 0 } },
            { id: 10004, _count: { comments: 0 } },
            { id: 10006, _count: { comments: 0 } },
          ],
        },
      })
        .on(e);
    },
  );

  await t.should("do a count with findManyUsers", async () => {
    await gql`
        query {
          findManyUsers {
            id
            name
            age
            _count {
              posts
            }
          }
        }
    `.expectData({
      findManyUsers: [
        { id: 1, name: "Jack", age: 20, _count: { posts: 8 } },
        { id: 3, name: "Kiki", age: 18, _count: { posts: 0 } },
        { id: 4, name: "George", age: 18, _count: { posts: 0 } },
        { id: 2, name: "New Name", age: 21, _count: { posts: 0 } },
        { id: 1234, name: "Mark", age: 22, _count: { posts: 2 } },
      ],
    })
      .on(e);
  });

  await t.should("work with executeRaw", async () => {
    await gql`
        mutation {
          testExecuteRaw(replacement: "Title 2 has been changed")
        }
    `.expectData({ testExecuteRaw: 3 })
      .on(e);
  });

  await t.should("work with complex queryRaw", async () => {
    await gql`
        query {
          testQueryRaw {
            id
            title
            reactions
          }
        }
    `.expectData({
      testQueryRaw: [
        {
          id: 10002,
          title: "Title 2 has been changed",
          reactions: 9,
        },
      ],
    })
      .on(e);
  });

  await t.should("work with a create/connect list", async () => {
    await gql`
        mutation {
          createOnePost(
            data: {
              id: 99999,
              title: "New Post",
              views: 1,
              likes: 9,
              published: true,
              author: { connect: { id: 1 } },
              comments: {
                # create: [ 
                #   { id: 59999, content: "it works!", author: { connect: { id: 1 } }}
                # ]
                connect: [ # equiv. {connect: { id: 50001}}
                  { id: 50001 },
                ]
              }
            }
          ) {
            id
            comments { id content }
          }
        }
    `.expectData({
      createOnePost: {
        id: 99999,
        comments: [
          { id: 50001, content: "good" },
        ],
      },
    })
      .on(e);
  });
});
