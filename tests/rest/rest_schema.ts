// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { fx, Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

export const tg = await typegraph("rest_schema", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  const complexType = t.struct(
    {
      a: t.integer(),
      b: t.struct({ c: t.integer(), d: g.ref("ComplexType") }),
      e: g.ref("ComplexType"),
    },
    { name: "ComplexType" },
  );

  const identity = deno
    .func(
      t.struct({
        input: complexType,
      }),
      complexType,
      {
        code: "(x) => x['input']",
        effect: fx.read(),
      },
    )
    .withPolicy(pub);

  g.expose({ identity });
});
