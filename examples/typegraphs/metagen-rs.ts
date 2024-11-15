// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { WasmRuntime } from "@typegraph/sdk/runtimes/wasm.ts";
// skip:end

await typegraph(
  {
    name: "metagen-rs",
    // skip:next-line
    cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
  },
  (g) => {
    const idv3 = t
      .struct({
        title: t.string(),
        artist: t.string(),
        releaseTime: t.datetime(),
        mp3Url: t.uri(),
        // explicit type names help when generating code
      })
      .rename("idv3");

    // the wire flavour is availible through a static
    // constructor
    const wasm = WasmRuntime.wire("metagen/rust.wasm");

    g.expose(
      {
        remix: wasm
          .handler(
            idv3,
            idv3,
            {
              name: "remix_track",
            },
            // the traits will map to the name of the materializer
            // and also the the name of the handler mentioned above
          )
          .rename("remix_track"),
      },
      Policy.public(),
    );
  },
);
