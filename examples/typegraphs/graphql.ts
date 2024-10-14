// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.ts";

// isort: off
// skip:end
// highlight-next-line
import { GraphQLRuntime } from "@typegraph/sdk/runtimes/graphql.ts";

await typegraph(
  {
    name: "graphql",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const db = new PrismaRuntime("database", "POSTGRES_CONN");
    // highlight-next-line
    const gql = new GraphQLRuntime("https://graphqlzero.almansi.me/api");
    const pub = Policy.public();

    // highlight-next-line
    const user = t.struct({ "id": t.string(), "name": t.string() }, {
      name: "User",
    });

    const message = t.struct(
      {
        id: t.integer({}, { asId: true, config: { auto: true } }),
        title: t.string(),
        // highlight-next-line
        user_id: t.string({}),
        // highlight-next-line
        user: gql.query(
          t.struct({
            // highlight-next-line
            id: t.string({}, { asId: true }).fromParent("user_id"),
          }),
          t.optional(user),
        ),
      },
      { name: "message" },
    );

    g.expose(
      {
        create_message: db.create(message),
        messages: db.findMany(message),
        // highlight-next-line
        users: gql.query(t.struct({}), t.struct({ data: t.list(user) })),
      },
      pub,
    );
  },
);
