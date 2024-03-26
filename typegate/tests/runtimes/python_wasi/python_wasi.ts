// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import outdent from "outdent";

const tpe = t.struct({
  "a": t.string(),
  "b": t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph("python_wasi", async (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();
  let identityModule;
  try {
    identityModule = await python.import(
      t.struct({ input: tpe }),
      tpe,
      {
        name: "identity",
        module: "typegate/tests/runtimes/python_wasi/py/hello.py",
        deps: ["typegate/tests/runtimes/python_wasi/py/nested/dep.py"],
      },
    );
  } catch (e) {
    console.error(e);
  }

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
    identityMod: identityModule!.withPolicy(pub),
  });
});
