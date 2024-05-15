// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.js";

export const denoDuplicateArtifact = await typegraph({
  name: "test_deno_dep",
}, (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    doAddition: deno.import(
      t.struct({ a: t.float(), b: t.float() }),
      t.float(),
      {
        module: "ts/dep/main.ts",
        name: "doAddition",
        deps: ["ts/dep/nested/dep.ts"],
      },
    ).withPolicy(pub),
    doAdditionDuplicate: deno.import(
      t.struct({ a: t.float(), b: t.float() }),
      t.float(),
      {
        module: "ts/dep/main.ts",
        name: "doAddition",
        deps: ["ts/dep/nested/dep.ts"],
      },
    ).withPolicy(pub),
  });
});
