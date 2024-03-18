// skip:start
import { Policy, t } from "@typegraph/sdk/index.js";
import { typegraph } from "@typegraph/sdk/typegraph.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

// skip:end

await typegraph({
  name: "prisma-runtime",
  cors: {
    // skip:start
    allowCredentials: false,
    allowHeaders: [],
    allowMethods: [],
    exposeHeaders: [],
    maxAgeSec: undefined,
    // skip:end
    // ..
    allowOrigin: ["https://metatype.dev", "http://localhost:3000"],
  },
}, (g) => {
  const pub = Policy.public();
  const db = new PrismaRuntime("legacy", "POSTGRES_CONN");
  const user = t.struct(
    {
      "id": t.uuid({ asId: true, config: { "auto": true } }),
      "email": t.email(),
      "firstname": t.string({ min: 2, max: 2000 }, {}),
    },
    { name: "user" },
  );

  g.expose({
    create_user: db.create(user),
    read_user: db.findMany(user),
    find_user: db.queryRaw(
      `SELECT id, firstname, email FROM "user" WHERE CAST(id as VARCHAR) = $\{id} OR email LIKE $\{term} OR firstname LIKE $\{term}`,
      t.struct(
        {
          "id": t.string(),
          "term": t.string(),
        },
      ),
      t.list(user),
    ),
  }, pub);
});
