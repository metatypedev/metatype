// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PythonRuntime, PythonModule } from "@typegraph/sdk/runtimes/python";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph("python_duplicate_artifacts", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  const mod = new PythonModule({
    path: "py/hello.py",
    deps: ["py/nested/dep.py"],
    exports: ["identity"],
  });

  g.expose({
    identityMod: python
      .import(t.struct({ input: tpe }), tpe, {
        module: mod.import("identity"),
      })
      .withPolicy(pub),
    identityModDuplicate: python
      .import(t.struct({ input: tpe }), tpe, {
        module: mod.import("identity"),
      })
      .withPolicy(pub),
  });
});
