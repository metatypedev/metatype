// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const pythonDirs = await typegraph("python_dirs", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    testDir: python
      .import(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py"],
      })
      .withPolicy(pub),
  });
});
