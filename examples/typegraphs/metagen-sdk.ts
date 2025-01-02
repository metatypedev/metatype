// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// skip:start
import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";
// skip:end
import { Metagen } from "@typegraph/sdk/metagen";

// get typegraph desc here
const tg = await typegraph(
  {
    name: "metagen-sdk",
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
      })
      .rename("idv3");

    const deno = new DenoRuntime();

    g.expose(
      {
        remix: deno
          .import(idv3, idv3, {
            module: "./metagen/ts/remix.ts",
            deps: ["./metagen/ts/fdk.ts"],
            name: "remix_track",
          })
          .rename("remix_track"),
      },
      Policy.public(),
    );
  },
);

// deno-lint-ignore no-constant-condition
if (false) {
  const myPath = import.meta.url.replace("file://", "");
  const metagen = new Metagen(
    // the workspace root that our config is relative to
    myPath + "/..",
    // this rest of the config is similmilar to the CLI config
    {
      targets: {
        main: [
          {
            generator: "fdk_ts",
            typegraph_path: myPath,
            path: "funcs/",
          },
        ],
      },
    },
  );
  // dry_run doesn't write to disk
  metagen.dryRun(tg, "main");
}
