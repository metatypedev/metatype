// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

typegraph("test-deno-static", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    simpleStatic: deno.static(
      t.either([t.string(), t.integer()]),
      "One!",
    ).withPolicy(pub),
    structStatic: deno.static(t.struct({ "a": t.string() }), {
      a: "Hello World",
    })
      .withPolicy(pub),
  });
});
