// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/sdk/index.js";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python.js";

const tpe = t.struct({
  "a": t.string(),
  "b": t.list(t.either([t.integer(), t.string()])),
});

export const tg = await typegraph(
  "python_duplicate_artifacts",
  (g: any) => {
    const python = new PythonRuntime();
    const pub = Policy.public();

    g.expose({
      identityMod: python.import(
        t.struct({ input: tpe }),
        tpe,
        {
          name: "identity",
          module: "py/hello.py",
          deps: ["py/nested/dep.py"],
        },
      ).withPolicy(pub),
      identityModDuplicate: python.import(
        t.struct({ input: tpe }),
        tpe,
        {
          name: "identity",
          module: "py/hello.py",
          deps: ["py/nested/dep.py"],
        },
      ).withPolicy(pub),
    });
  },
);
