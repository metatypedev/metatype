// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.ts";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph("python_duplicate_artifacts", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identityMod: python
      .import(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py/nested/dep.py"],
      })
      .withPolicy(pub),
    identityModDuplicate: python
      .import(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py/nested/dep.py"],
      })
      .withPolicy(pub),
  });
});
