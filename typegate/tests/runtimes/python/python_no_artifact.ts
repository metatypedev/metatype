// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";
import outdent from "outdent";

const tpe = t.struct({
  "a": t.string(),
  "b": t.list(t.either([t.integer(), t.string()])),
});

export const tgNoArtifact = await typegraph("python_no_artifact", (g: any) => {
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
  });
});
