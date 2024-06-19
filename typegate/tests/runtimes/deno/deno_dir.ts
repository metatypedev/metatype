// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

export const tg = await typegraph(
  {
    name: "deno_dirs",
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    g.expose({
      testDir: deno
        .import(t.struct({ a: t.float(), b: t.float() }), t.float(), {
          module: "ts/dep/main.ts",
          name: "doAddition",
          deps: ["ts/dep/nested"],
        })
        .withPolicy(pub),
    });
  }
);
