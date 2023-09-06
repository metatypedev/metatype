// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Policy, t, typegraph } from "@typegraph/deno/src/mod.ts";
import { DenoRuntime } from "@typegraph/deno/src/runtimes/deno.ts";

const student = t.struct({
  id: t.integer(),
  name: t.string(),
  infos: t.struct({
    age: t.integer({ min: 10 }),
    school: t.string().optional(),
  }),
}, { name: "Student" });

typegraph("test-apply", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();

  g.expose({
    test: deno.func(
      t.struct({ student }),
      student,
      { code: "({ student }) => student" },
    )
      .apply({
        input: {
          id: 1,
        },
      })
      .apply({
        input: {
          infos: { age: g.inherit() },
        },
      })
      .apply({
        input: {
          id: 2,
        },
      })
      .withPolicy(pub),
  });
});
