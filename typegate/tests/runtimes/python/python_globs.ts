// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PythonRuntime } from "@typegraph/sdk/runtimes/python.ts";
import { Policy, t, typegraph } from "@typegraph/sdk/index.ts";

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
