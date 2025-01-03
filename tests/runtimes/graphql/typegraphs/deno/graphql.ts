// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql";
import * as effects from "@typegraph/sdk/effects";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

const user = t.struct(
  {
    id: t.string({}, { asId: true }),
    name: t.string(),
    // TODO more fields with more types
  },
  { name: "User" },
);

const createUserInput = t.struct({
  name: t.string(),
  username: t.string(),
  email: t.string(),
}, { name: "CreateUserInput" });

export const tg = await typegraph("graphql", (g) => {
  const graphql = new GraphQLRuntime("https://graphqlzero.almansi.me/api");
  const pub = Policy.public();
  const db = new PrismaRuntime("graphql", "POSTGRES");

  const message = t.struct(
    {
      id: t.integer({}, { asId: true, config: { auto: true } }),
      title: t.string(),
      user_id: t.string(),
      user: graphql.query(
        t.struct({
          id: t.string({}, { asId: true }).fromParent("user_id"),
        }),
        t.optional(user),
      ),
    },
    { name: "message" },
  );

  g.expose({
    user: graphql
      .query(t.struct({ id: t.string({}, { asId: true }) }), user)
      .withPolicy(pub),
    users: graphql
      .query(
        t.struct({}),
        t.struct({
          data: t.list(user),
        }),
      )
      .withPolicy(pub),
    createUser: graphql
      .mutation(
        t.struct({
          input: createUserInput,
        }),
        user,
        effects.create(false),
      )
      .withPolicy(pub),
    create_message: db.create(message).withPolicy(pub),
    messages: db.findMany(message).withPolicy(pub),
  });
});
