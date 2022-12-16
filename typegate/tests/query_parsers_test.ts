// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "./utils.ts";
import * as mf from "test/mock_fetch";
import { buildSchema, graphql } from "graphql";

const schema = buildSchema(`
	type User {
		id: ID!
		name: String!
	}

	type Picture {
		id: ID!
		url: String!
	}

	type ProfileMutation {
		setPicture(id: ID!, url: String!): Picture!
	}

	type UserMutation {
		update(id: ID!, name: String!): User!
		profile: ProfileMutation!
	}

	type Mutation {
		user: UserMutation!
	}

	type ProfileQuery {
		picture(id: ID!): Picture!
	}

	type UserQuery {
		find(id: ID!): User!
		profile: ProfileQuery!
	}

	type Query {
		user: UserQuery!
	}
`);

const rootValue = {
  user: {
    find: ({ id }: { id: string }) => {
      return {
        id,
        name: `User ${id}`,
      };
    },
    update: ({ id, name }: { id: string; name: string }) => {
      return {
        id,
        name,
      };
    },
    profile: {
      picture: ({ id }: { id: string }) => {
        return {
          id,
          url: `image/${id}`,
        };
      },
      setPicture: ({ id, url }: { id: string; url: string }) => {
        return {
          id,
          url,
        };
      },
    },
  },
};

mf.install();

mf.mock("POST@/api/graphql", async (req) => {
  const { query, variables } = await req.json();
  const res = await graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables,
  });
  return new Response(JSON.stringify(res), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
});

test("GraphQL parser", async (t) => {
  const e = await t.pythonFile("typegraphs/graphql_namespaces.py");

  await t.should("split typgraph into queries and mutations", () => {
    /**
     * Types from the parsed TypeGraph
     */
    const types = e.tg.tg.types;
    t.assertSnapshot(types);
  });

  await t.should("allow queries in namespaces", async () => {
    await gql`
			query {
				user {
					find(id: "1") {
						id
						name
					}
				}
			}
		`
      .expectData({
        user: {
          find: {
            id: "1",
            name: "User 1",
          },
        },
      })
      .on(e);
  });

  await t.should("allow mutations in namespaces", async () => {
    await gql`
			mutation {
				user {
					update(id: "2", name: "User 2") {
						id
						name
					}
				}
			}
		`
      .expectData({
        user: {
          update: {
            id: "2",
            name: "User 2",
          },
        },
      })
      .on(e);
  });

  await t.should("allow queries in nested namespaces", async () => {
    await gql`
			query {
				user {
					profile {
						picture(id: "1") {
							id
							url
						}
					}
				}
			}
		`
      .expectData({
        user: {
          profile: {
            picture: {
              id: "1",
              url: "image/1",
            },
          },
        },
      })
      .on(e);
  });

  await t.should("allow mutations in nested namespaces", async () => {
    await gql`
			mutation {
				user {
					profile {
						setPicture(id: "2", url: "image/2") {
							id
							url
						}
					}
				}
			}
		`
      .expectData({
        user: {
          profile: {
            setPicture: {
              id: "2",
              name: "image/2",
            },
          },
        },
      })
      .on(e);
  });
});
