// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

// export the typegraph
export const tg = await typegraph({
  name: "self-deploy",
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    test: deno.static(t.struct({ a: t.string() }), { a: "HELLO" }),
    sayHello: deno.import(
      t.struct({ name: t.string() }),
      t.string(),
      // relative to cwd
      { module: "scripts/main.ts", name: "sayHello" },
    ),
    sayHelloLambda: deno.func(
      t.struct({ name: t.string() }),
      t.string(),
      { code: "({ name }) => `Hello ${name} from deno lambda`" },
    ),
  }, pub);
});
