import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma.js";

typegraph(
  {
    name: "quick-start-project",
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    // access control
    const pub = Policy.public();

    // runtimes
    const deno = new DenoRuntime();
    const python = new PythonRuntime();
    const db = new PrismaRuntime("database", "POSTGRES");

    // database tables
    const message = t.struct(
      {
        id: t.integer({}, { asId: true, config: { auto: true } }), // configuring our primary key
        title: t.string(),
        body: t.string(),
      },
      { name: "message" } // the name of our type
    );

    g.expose({
      add: python
        .fromLambda(
          t.struct({ first: t.float(), second: t.float() }),
          t.float(),
          { code: "lambda x: x['first'] + x['second']" }
        )
        .withPolicy(pub),
      multiply: deno
        .func(t.struct({ first: t.float(), second: t.float() }), t.float(), {
          code: "({first, second}) => first * second",
        })
        .withPolicy(pub),
      create_message: db.create(message).withPolicy(pub),
      list_messages: db.findMany(message).withPolicy(pub),
    });
  }
);
