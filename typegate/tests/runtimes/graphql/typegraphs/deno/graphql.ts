// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.js";
import * as effects from "@typegraph/sdk/effects.js";

const user = t.struct({
  id: t.integer(),
  // TODO more fields with more types
}, { name: "User" });

typegraph("graphql", (g: any) => {
  const graphql = new GraphQLRuntime("https://example.com/api/graphql");
  const pub = Policy.public();

  g.expose({
    user: graphql.query(t.struct({ id: t.integer() }), user).withPolicy(pub),
    createUser: graphql.mutation(
      t.struct({ id: t.integer() }),
      user,
      effects.create(false),
    )
      .withPolicy(pub),
  });
});
