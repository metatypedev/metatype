// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dnt, resolve } from "./deps.ts";
import { getLockfile, projectDir } from "./utils.ts";

const lockfile = await getLockfile();

const outDir = resolve(projectDir, "../typegraph/node");
await dnt.emptyDir(outDir);

await dnt.build({
  entryPoints: [resolve(projectDir, "../typegraph/deno/mod.ts")],
  outDir,
  shims: {
    deno: true,
  },
  package: {
    name: "@metatypedev/typegraph",
    version: lockfile.dev.lock.METATYPE_VERSION,
    description: lockfile.dev.lock.TAGLINE,
    license: "MPL-2.0",
    repository: {
      type: "git",
      url: "git+https://github.com/metatypedev/metatype.git",
    },
    bugs: {
      url: "https://github.com/metatypedev/metatype/issues",
    },
  },
  postBuild() {
    Deno.copyFileSync(
      resolve(projectDir, "LICENSE-MPL-2.0.md"),
      resolve(outDir, "LICENSE.md"),
    );
  },
});
