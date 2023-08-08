import { g, t, typegraph } from "../../../../../../typegraph/deno/src/mod.ts";
import { GraphQLRuntime } from "../../../../../../typegraph/deno/src/runtimes/graphql.ts";
import * as effects from "../../../../../../typegraph/deno/src/effects.ts";

const user = t.struct({
  id: t.integer(),
  // TODO more fields with more types
}, { name: "User" });

typegraph("test-types", (expose) => {
  const graphql = new GraphQLRuntime("https://example.com/api/graphql");
  const pub = g.Policy.public();

  expose({
    user: graphql.query(t.struct({ id: t.integer() }), user).withPolicy(pub),
    createUser: graphql.mutation(t.struct({}), user, effects.create(false))
      .withPolicy(pub),
  });
});
