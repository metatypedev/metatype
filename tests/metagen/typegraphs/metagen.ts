// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Policy, t, typegraph } from "@typegraph/sdk";
import { PythonRuntime } from "@typegraph/sdk/runtimes/python";

export const tg = await typegraph(
  {
    name: "example-metagen",
  },
  (g) => {
    const python = new PythonRuntime();
    const pub = Policy.public();
    const student = t.struct(
      {
        id: t.integer({}, { asId: true }),
        name: t.string(),
        peers: t.list(g.ref("Student")).optional(),
      },
      { name: "Student" },
    );

    g.expose(
      {
        one: python.import(t.struct({ name: t.string() }), t.list(student), {
          module: "./scripts/same_hit.py",
          name: "fnOne",
        }),
        two: python.import(
          t.struct({ name: t.string() }).rename("TwoInput"),
          t.string(),
          {
            module: "./scripts/same_hit.py",
            name: "fnTwo",
          },
        ),
        three: python.import(t.struct({ name: t.string() }), student, {
          module: "other.py",
          name: "three",
        }),
      },
      pub,
    );
  },
);
