// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

// isort: off
// skip:end
// highlight-next-line
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.js";

typegraph({
  name: "graphql",
}, (g) => {
  const db = new PrismaRuntime("database", "POSTGRES_CONN");
  // highlight-next-line
  const gql = new GraphQLRuntime("https://graphqlzero.almansi.me/api");
  const pub = Policy.public();

  // highlight-next-line
  const user = t.struct({ "id": t.string(), "name": t.string() });

  const message = t.struct(
    {
      "id": t.integer({}, { asId: true, config: { auto: true } }),
      "title": t.string(),
      // highlight-next-line
      "user_id": t.string().rename("uid"),
      // highlight-next-line
      "user": gql.query(
        t.struct(
          {
            // highlight-next-line
            "id": t.string({}, { asId: true }).fromParent("uid"),
          },
        ),
        t.optional(user),
      ),
    },
  ).rename("message");

  g.expose({
    create_message: db.create(message),
    messages: db.findMany(message),
    // highlight-next-line
    users: gql.query(t.struct({}), t.struct({ "data": t.list(user) })),
  }, pub);
});
