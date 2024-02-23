// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

const hello = ({ name }: any) => `Hello ${name}`;
function helloFn({ name }: any) {
  return `Hello ${name}`;
}

typegraph("test-deno-static", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    static: deno.static(t.struct({ a: t.string() }), {
      a: "Hello World",
    }).withPolicy(pub),
    hello: deno.func(
      t.struct({ name: t.string() }),
      t.string(),
      { code: hello },
    ).withPolicy(pub),
    helloFn: deno.func(
      t.struct({ name: t.string() }),
      t.string(),
      { code: helloFn },
    ).withPolicy(pub),
  });
});
