// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";
// skip:end

await typegraph(
  {
    name: "metagen-deno",
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

    const deno = new DenoRuntime();

    g.expose(
      {
        remix: deno
          .import(idv3, idv3, {
            module: "./metagen/ts/remix.ts",
            deps: ["./metagen/ts/mdk.ts"],
            name: "remix_track",
          })
          .rename("remix_track"), // explicit names help
      },
      Policy.public()
    );
  }
);
