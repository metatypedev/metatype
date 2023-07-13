// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";
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

	type Mutation {
		updateUser(id: ID!, name: String!): User!
		profile: ProfileMutation!
	}

	type ProfileQuery {
		picture(id: ID!): Picture!
	}

	type Query {
		findUser(id: ID!): User!
		profile: ProfileQuery!
	}
`);

const getPictureUrl = (id: string) => `https://example.com/image/${id}`;

const rootValue = {
  findUser: ({ id }: { id: string }) => {
    return {
      id,
      name: `User ${id}`,
    };
  },
  updateUser: ({ id, name }: { id: string; name: string }) => {
    return {
      id,
      name,
    };
  },
  profile: {
    picture: ({ id }: { id: string }) => {
      return {
        id,
        url: getPictureUrl(id),
      };
    },
    setPicture: ({ id, url }: { id: string; url: string }) => {
      return {
        id,
        url,
      };
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

Meta.test("GraphQL parser", async (t) => {
  const e = await t.engine("query_parsers/graphql_namespaces.py");

  await t.should("split typgraph into queries and mutations", () => {
    /**
     * Types from the parsed TypeGraph
     */
    const types = e.tg.tg.types;
    t.assertSnapshot(types);
  });

  const id = globalThis.crypto.randomUUID();

  await t.should("allow queries in namespaces", async () => {
    await gql`
			query FindUser($id: ID!) {
				user {
					find(id: $id) {
						id
						name
					}
				}
			}
		`
      .withVars({ id })
      .expectData({
        user: {
          find: {
            id,
            name: `User ${id}`,
          },
        },
      })
      .on(e);
  });

  const id2 = globalThis.crypto.randomUUID();

  await t.should("allow mutations in namespaces", async () => {
    await gql`
			mutation UpdateUser($id: ID!, $name: String!) {
				user {
					update(id: $id, name: $name) {
						id
						name
					}
				}
			}
		`
      .withVars({ id: id2, name: "User 2" })
      .expectData({
        user: {
          update: {
            id: id2,
            name: "User 2",
          },
        },
      })
      .on(e);
  });

  await t.should("allow queries in nested namespaces", async () => {
    await gql`
			query GetUserProfilePic($id: ID!) {
				user {
					profile {
						picture(id: $id) {
							id
							url
						}
					}
				}
			}
		`
      .withVars({ id })
      .expectData({
        user: {
          profile: {
            picture: {
              id,
              url: getPictureUrl(id),
            },
          },
        },
      })
      .on(e);
  });

  await t.should("allow mutations in nested namespaces", async () => {
    await gql`
			mutation SetProfilePic($id: ID!, $url: String!) {
				user {
					profile {
						setPicture(id: $id, url: $url) {
							id
							url
						}
					}
				}
			}
		`
      .withVars({ id, url: getPictureUrl("2") })
      .expectData({
        user: {
          profile: {
            setPicture: {
              id,
              url: getPictureUrl("2"),
            },
          },
        },
      })
      .on(e);
  });
});
