import {
  Policy,
  t,
  typegraph,
} from "../../../typegraph/node/sdk/dist/index.js";
import { RandomRuntime } from "../../../typegraph/node/sdk/dist/runtimes/random.js";

typegraph(
  {
    name: "gen-test",
    builder(g) {
      const obj = t.struct({
        str: t.string(),
        int: t.integer(),
        file: t.file(),
        opt: t.optional(t.string()),
        either: t.either([
          t.struct({ a: t.string() }),
          t.struct({ b: t.string() }),
        ]),
        union: t.union([
          t.struct({ a: t.string() }),
          t.struct({ b: t.string() }),
        ]),
        list: t.list(t.string()),
      });

      const rand_rt = new RandomRuntime({});
      g.expose(
        {
          random: rand_rt.gen(obj),
        },
        Policy.public(),
      );
    },
  },
);
