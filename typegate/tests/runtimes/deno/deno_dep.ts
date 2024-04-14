// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

export const tg = await typegraph({
  name: "test-deno-dep",
}, (g: any) => {
  const deno = DenoRuntime();
  const pub = Policy.public();

  g.expose({
    doAddition: deno.import(
      t.struct({ a: t.float(), b: t.float() }),
      t.float(),
      {
        module: "ts/dep/main.ts",
        name: "doAddition",
      },
    ).withPolicy(pub),
  });
});
