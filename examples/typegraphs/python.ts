// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { PythonModule, PythonRuntime } from "@typegraph/sdk/runtimes/python";

// skip:end

await typegraph(
  {
    name: "python",
  },
  (g) => {
    const python = new PythonRuntime();
    const pub = Policy.public();

    g.expose(
      {
        add: python.fromLambda(
          t.struct({ a: t.integer(), b: t.integer() }),
          t.integer(),
          // we can provide the code inline using lambdas
          { code: "lambda x: (x['a'] + x['b'])" },
        ),
        sayHello: python.import(
          t.struct({ name: t.string() }),
          t.string(),
          // point to a local python file
          {
            module: "./scripts/hello.py",
            name: "say_hello", // name of the function to use
            // deps: ["deps.py"], path to dependencies
          },
        ),
      },
      pub,
    );

    // We can also use the following method for reusability
    const mod = new PythonModule({
      path: "./scripts/hello.py",
      deps: ["./scripts/deps.py"],
    });

    g.expose(
      {
        sayHelloAlt: python.import(t.struct({ name: t.string() }), t.string(), {
          module: mod.import("say_hello"), // name of the function to use
        }),
      },
      pub,
    );
  },
);
