import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python";
import { PrismaRuntime } from "@typegraph/sdk/providers/prisma";

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

    // types, database tables
    const message = t.struct(
      {
        id: t.integer({}, { asId: true, config: { auto: true } }), // configuring our primary key
        title: t.string(),
        body: t.string(),
      },
      { name: "message" }, // the name of our type
    );

    // custom functions
    const add = deno.func(
      t.struct({ first: t.float(), second: t.float() }),
      t.float(),
      { code: "({first, second}) => first + second" },
    );
    const hello = python.fromLambda(
      t.struct({ world: t.string() }),
      t.string(),
      { code: `lambda x: f"Hello {x['world']}!"` },
    );

    g.expose(
      {
        add,
        hello,
        create_message: db.create(message),
        list_messages: db.findMany(message),
      },
      pub,
    );
  },
);
