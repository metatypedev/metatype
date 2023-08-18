// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { PythonRuntime } from "@typegraph/deno/src/runtimes/python.ts";

const tpe = t.struct({
  "a": t.string(),
  "b": t.array(t.either([t.integer(), t.string()])),
});

typegraph("python_wasi", (g) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identityLambda: t.func(
      t.struct({ input: tpe }),
      tpe,
      python.fromLambda("lambda x: x['input']"),
    ).withPolicy(pub),
    identityDef: t.func(
      t.struct({ input: tpe }),
      tpe,
      python.fromDef("def identity(x):\n\treturn x['input']"),
    ).withPolicy(pub),
    identityMod: python.import(
      t.struct({ input: tpe }),
      tpe,
      { name: "identity", module: "py/hello.py" },
    ).withPolicy(pub),
  });
});
