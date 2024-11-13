// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

await typegraph("deps", (g) => {
  const pub = Policy.public();
  const deno = new DenoRuntime();

  g.expose({
    add: deno
      .import(t.struct({ lhs: t.integer(), rhs: t.integer() }), t.integer(), {
        name: "add",
        module: "../deps/ops.ts",
      })
      .withPolicy(pub),
  });
});
