// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { fx, Policy, t, typegraph } from "../../../typegraph/deno/src/mod.ts";
import { DenoRuntime } from "../../../typegraph/deno/src/runtimes/deno.ts";

const complexType = t.struct({
  a: t.integer(),
  b: t.struct({ c: t.integer(), d: t.proxy("ComplexType") }),
  e: t.proxy("ComplexType"),
}, { name: "ComplexType" });

typegraph("rest_schema", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const identity = deno.func(
    t.struct({
      input: complexType,
    }),
    complexType,
    {
      code: "(x) => x['input']",
      effect: fx.read(),
    },
  ).withPolicy(pub);

  g.expose({ identity });
});
