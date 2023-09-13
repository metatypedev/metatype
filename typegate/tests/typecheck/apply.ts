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

const grades = t.struct({
  year: t.integer({ min: 2000 }),
  subjects: t.array(
    t.struct({
      name: t.string(),
      score: t.integer(),
    }),
  ),
});

const tpe = t.struct({ student, grades: grades.optional() });

typegraph("test-apply", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();
  const identityStudent = deno.func(
    tpe,
    tpe,
    { code: "({ student, grades }) => { return { student, grades } }" },
  );

  g.expose({
    testInvariant: identityStudent.apply({
      student: {
        id: g.inherit(),
        name: g.inherit(),
        infos: {
          age: g.inherit(),
          school: g.inherit(),
        },
      },
      // grades: g.inherit(), // implicit
    }).withPolicy(pub),

    applyComposition: identityStudent
      .apply({
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
        // grades: g.inherit(), // implicit
      })
      .apply({
        // student: g.inherit(), // implicit
        grades: {
          year: g.inherit(),
          subjects: [
            { name: "Math", score: 60 },
          ],
        },
      })
      .withPolicy(pub),
  });
});
