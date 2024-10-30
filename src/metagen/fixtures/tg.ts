import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.ts";

typegraph({
  name: "gen-test",
  builder(g) {
    const obj = t
      .struct({
        str: t.string(),
        int: t.integer(),
        float: t.float(),
        boolean: t.boolean(),
        // FIXME file upload for FDK
        // file: t.file(),
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
        type: t.string(),
      })
      .rename("MyObj");

    const wasm = WasmRuntime.wire("placeholder");
    g.expose(
      {
        my_faas: wasm.handler(obj, obj, { name: "my_faas" }).rename("my_faas"),
      },
      Policy.public(),
    );
  },
});
