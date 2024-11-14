// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

// skip:end
typegraph(
  {
    name: "union-either",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const deno = new DenoRuntime();
    const members = [
      t.string().rename("scalar_1"),
      t.integer().rename("scalar_2"),
      t.struct({
        field1: t.string(),
      }).rename("comp_1"),
      t.struct({
        field2: t.string(),
      }).rename("comp_2"),
      t.list(t.string()).rename("scalar_list"),
      /* FIXME: list of composites is broken
        t.list(
          t.struct({
            listField: t.string(),
          }),
        ), */
    ];
    g.expose({
      outer: deno.func(
        // input
        t.struct({}),
        // output
        t.struct({
          union: t.union(members),
          either: t.either(members),
          unionList: t.list(t.union(members)),
        }),
        {
          code: () => ({
            either: {
              field1: "1",
            },
            union: {
              field2: "2",
            },
            unionList: [
              "scalar",
              2,
              {
                field1: "1",
              },
              {
                field2: "2",
              },
              ["scalar_1", "scalar_2"],
            ],
          }),
        },
      ),
    }, Policy.public());
  },
);
