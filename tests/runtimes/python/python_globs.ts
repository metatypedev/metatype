// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { PythonRuntime } from "@typegraph/sdk/runtimes/python";
import { Policy, t, typegraph } from "@typegraph/sdk";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph("python_globs", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    testGlob: python
      .import(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py/**/*.py"],
      })
      .withPolicy(pub),
  });
});
