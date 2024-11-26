// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno";

const hello = ({ name }: any) => `Hello ${name}`;
function helloFn({ name }: any) {
  return `Hello ${(name as string).toLowerCase()}`;
}

export const tg = await typegraph("test-deno-tyepscript", (g: any) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    static: deno
      .static(t.struct({ a: t.string() }), {
        a: "Hello World",
      })
      .withPolicy(pub),
    hello: deno
      .func(t.struct({ name: t.string() }), t.string(), { code: hello })
      .withPolicy(pub),
    helloFn: deno
      .func(t.struct({ name: t.string() }), t.string(), { code: helloFn })
      .withPolicy(pub),
  });
});
