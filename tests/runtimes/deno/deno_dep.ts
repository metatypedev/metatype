// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

export const tg = await typegraph(
  {
    name: "test_deno_dep",
  },
  (g) => {
    const deno = new DenoRuntime();
    const pub = Policy.public();

    g.expose({
      doAddition: deno
        .import(t.struct({ a: t.float(), b: t.float() }), t.float(), {
          module: "ts/dep/main.ts",
          name: "doAddition",
          deps: ["ts/dep/nested/dep.ts"],
        })
        .withPolicy(pub),
    });
  },
);
