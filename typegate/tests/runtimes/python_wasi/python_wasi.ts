// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import outdent from "outdent";

const tpe = t.struct({
  "a": t.string(),
  "b": t.list(t.either([t.integer(), t.string()])),
});

typegraph("python_wasi", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identityLambda: python.fromLambda(
      t.struct({ input: tpe }),
      tpe,
      { code: "lambda x: x['input']" },
    ).withPolicy(pub),
    identityDef: python.fromDef(
      t.struct({ input: tpe }),
      tpe,
      {
        code: outdent`
        def identity(x):
          return x['input']
        `,
      },
    ).withPolicy(pub),
    identityMod: python.import(
      t.struct({ input: tpe }),
      tpe,
      { name: "identity", module: "py/hello.py" },
    ).withPolicy(pub),
  });
});
