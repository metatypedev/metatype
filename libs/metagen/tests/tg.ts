import {
  Policy,
  t,
  typegraph,
} from "../../../typegraph/node/sdk/dist/index.js";
import { WasmRuntime } from "../../../typegraph/node/sdk/dist/runtimes/wasm.js";

typegraph(
  {
    name: "gen-test",
    builder(g) {
      const obj = t.struct({
        str: t.string(),
        int: t.integer(),
        float: t.float(),
        boolean: t.boolean(),
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
      }).rename("MyObj");

      const wasm = WasmRuntime.wire("placeholder");
      g.expose(
        {
          my_faas: wasm.handler(
            obj,
            obj,
            { func: "my_faas" },
          ).rename("my_faas"),
        },
        Policy.public(),
      );
    },
  },
);
