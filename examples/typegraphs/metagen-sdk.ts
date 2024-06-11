// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";
// skip:end
import { Metagen } from "@typegraph/sdk/metagen.js";

// get typegraph desc here
const tg = await typegraph({
  name: "metagen-sdk",
  // skip:next-line
  cors: { allowOrigin: ["https://metatype.dev", "http://localhost:3000"] },
}, (g) => {
  const idv3 = t.struct({
    title: t.string(),
    artist: t.string(),
    releaseTime: t.datetime(),
    mp3Url: t.uri(),
  }).rename("idv3");

  const deno = new DenoRuntime();

  g.expose({
    remix: deno.import(
      idv3,
      idv3,
      {
        module: "./metagen/ts/remix.ts",
        deps: ["./metagen/ts/mdk.ts"],
        name: "remix_track",
      },
    ).rename("remix_track")
  }, Policy.public());
});

if (false) {
  const myPath = import.meta.url.replace("file://", "");
  const metagen = new Metagen(
    // the workspace root that our config is relative to
    myPath + "/..",
    // this rest of the config is similmilar to the CLI config
    {
      "targets": {
        "main": [
          {
            "generator": "mdk_typescript",
            "typegraph_path": myPath,
            "path": "funcs/",
          },
        ],
      },
    }
  );
  // dry_run doesn't write to disk
  metagen.dryRun(tg, "main")
}
