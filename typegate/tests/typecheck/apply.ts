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
  distinctions: t.struct({
    awards: t.array(t.struct({
      name: t.string(),
      points: t.integer(),
    })).optional(),
    medals: t.integer().optional(),
  }).optional(),
}, { name: "Student" });

typegraph("test-apply", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();
  const identityStudent = deno.func(
    t.struct({ student }),
    student,
    { code: "({ student }) => student" },
  );

  g.expose({
    testInvariantA: identityStudent.apply({
      student: {
        id: g.inherit(),
        name: g.inherit(),
        infos: {
          age: g.inherit(),
          school: g.inherit(),
        },
      },
    }).withPolicy(pub),
    testInvariantB: identityStudent
      .apply({
        // inherit all first depth nodes => behave the same as a func without apply
        student: {
          id: g.inherit(),
          name: g.inherit(),
          infos: g.inherit(),
          distinctions: g.inherit(),
        },
      })
      .apply({
        // partial injection
        student: {
          id: 1234,
          name: g.inherit(),
          infos: g.inherit(),
          distinctions: {
            awards: [
              { name: "Chess", points: 1000 },
              { name: "Math Olympiad", points: 100 },
            ],
            medals: g.inherit(),
          },
        },
      })
      .withPolicy(pub),
  });
});
