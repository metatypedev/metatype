// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import { Policy, t, typegraph } from "@typegraph/sdk/index.js";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const pythonGlonTg = await typegraph("python_globs", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    test_glob: python
      .import_(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py/*.py"],
      })
      .withPolicy(pub),
    test_dir: python
      .import_(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py"],
      })
      .withPolicy(pub),
  });
});
