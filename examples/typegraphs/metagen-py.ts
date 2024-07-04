// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.ts";
// skip:end

await typegraph(
  {
    name: "metagen-py",
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

    const python = new PythonRuntime();

    g.expose(
      {
        remix: python
          .import(idv3, idv3, {
            module: "./metagen/py/remix.py",
            deps: ["./metagen/py/remix_types.py"],
            name: "remix_track",
          })
          .rename("remix_track"), // explicit names help
      },
      Policy.public()
    );
  }
);
