// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python";
import outdent from "outdent";

const tpe = t.struct({
  a: t.string(),
  b: t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph("python", (g: any) => {
  const python = new PythonRuntime();
  const pub = Policy.public();

  g.expose({
    identityLambda: python
      .fromLambda(t.struct({ input: tpe }), tpe, {
        code: "lambda x: x['input']",
      })
      .withPolicy(pub),
    identityDef: python
      .fromDef(t.struct({ input: tpe }), tpe, {
        code: outdent`
        def identity(x):
          return x['input']
        `,
      })
      .withPolicy(pub),
    identityMod: python
      .import(t.struct({ input: tpe }), tpe, {
        name: "identity",
        module: "py/hello.py",
        deps: ["py/nested/dep.py"],
      })
      .withPolicy(pub),
  });
});
