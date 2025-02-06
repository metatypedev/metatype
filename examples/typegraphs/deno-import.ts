// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoModule, DenoRuntime } from "@typegraph/sdk/runtimes/deno";

// skip:end

await typegraph(
  {
    name: "deno-import",
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    g.expose(
      {
        add: deno.import(
          t.struct({ a: t.integer(), b: t.integer() }),
          t.integer(),
          {
            module: "./scripts/ops.ts", // path to ts file
            name: "doAddition", // function export to use
            // deps: [], path to dependecies
          },
        ),
      },
      pub,
    );

    // We can also use the following method for reusability
    const mod = new DenoModule({
      path: "./scripts/ops.ts",
      deps: ["./scripts/deps.ts"],
    });

    g.expose(
      {
        add_alt: deno.import(
          t.struct({ a: t.integer(), b: t.integer() }),
          t.integer(),
          { module: mod.import("doAddition") }, // name of the function to use
        ),
      },
      pub,
    );
  },
);
