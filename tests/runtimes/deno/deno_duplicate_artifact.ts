// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoModule, DenoRuntime } from "@typegraph/sdk/runtimes/deno";

export const tg = await typegraph(
  {
    name: "test_deno_dep",
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    const mod = new DenoModule({
      path: "ts/dep/main.ts",
      deps: ["ts/dep/nested/dep.ts"],
      exports: ["doAddition"],
    });

    g.expose({
      doAddition: deno
        .import(t.struct({ a: t.float(), b: t.float() }), t.float(), {
          module: mod.import("doAddition"),
        })
        .withPolicy(pub),
      doAdditionDuplicate: deno
        .import(t.struct({ a: t.float(), b: t.float() }), t.float(), {
          module: mod.import("doAddition"),
        })
        .withPolicy(pub),
    });
  },
);
