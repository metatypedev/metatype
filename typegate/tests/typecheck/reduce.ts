// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { fx, Policy, t, typegraph } from "@typegraph/sdk/mod.ts";
import { DenoRuntime } from "@typegraph/sdk/runtimes/deno.ts";

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

typegraph("test-reduce-deno", (g) => {
  const deno = new DenoRuntime();
  const pub = Policy.public();
  const identityStudent = deno.func(
    tpe,
    tpe,
    { code: "({ student, grades }) => { return { student, grades } }" },
  );

  g.expose({
    testInvariant: identityStudent.reduce({
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
    reduceComposition: identityStudent
      .reduce({
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
      .reduce({
        // student: g.inherit(), // implicit
        grades: {
          year: g.inherit(),
          subjects: g.inherit().set([ // sugar
            { name: "Math", score: 60 },
          ]),
        },
      })
      .withPolicy(pub),

    injectionInherit: identityStudent
      .reduce({
        student: {
          id: 1234,
          name: g.inherit(),
          infos: g.inherit().fromContext("personalInfos"),
        },
        grades: {
          year: g.inherit().set(2000),
          subjects: g.inherit().fromContext({
            [fx.READ]: "subjects",
          }),
        },
      })
      .withPolicy(pub),
  });
});
