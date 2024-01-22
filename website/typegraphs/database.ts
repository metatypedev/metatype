// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";

// isort: off
// skip:end
// highlight-next-line
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

typegraph({
  name: "database",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const db = new PrismaRuntime("database", "POSTGRES_CONN");
  const pub = Policy.public();

  const message = t.struct(
    {
      // highlight-next-line
      "id": t.integer({}, { asId: true, config: { auto: true } }),
      "title": t.string(),
      "body": t.string(),
    },
    // highlight-next-line
    { name: "message" },
  );

  g.expose({
    // highlight-next-line
    create_message: db.create(message).withPolicy(pub),
    list_messages: db.findMany(message).withPolicy(pub),
  });
});
