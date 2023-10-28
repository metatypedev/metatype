// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("deno(sdk): reduce", async (t) => {
  const e = await t.engine("typecheck/reduce.ts");

  await t.should(
    "work as normal if all nodes have g.inherit() flag",
    async () => {
      await gql`
        query {
          testInvariant (
            student: {
              id: 1
              name: "Jake"
              infos: { age: 15 }
            }
          ) {
            student {
              id
              name
              infos { age school }
            }
          }
        }
      `.expectData({
        testInvariant: {
          student: {
            id: 1,
            name: "Jake",
            infos: { age: 15 },
          },
        },
      })
        .on(e);
    },
  );

  await t.should(
    "compose reduce and work with partial static injections",
    async () => {
      await gql`
        query {
          reduceComposition (
            student: {
              name: "Jake"
              infos: { age: 15 }
              distinctions: { medals: 7 }
            }
            grades: { year: 2023 }
          ) {
            student {
              id
              name
              infos { age school }
              distinctions {
                awards { name points }
                medals
              }
            }
            grades {
              year
              subjects { name score }
            }
          }
        }
      `.expectData({
        reduceComposition: {
          student: {
            id: 1234, // from reduce 1
            name: "Jake", // from user
            infos: { age: 15 }, // from user
            distinctions: {
              awards: [ // from reduce 1
                { name: "Chess", points: 1000 },
                { name: "Math Olympiad", points: 100 },
              ],
              medals: 7, // from user
            },
          },
          grades: {
            year: 2023, // from user
            subjects: [ // from reduce 2
              { name: "Math", score: 60 },
            ],
          },
        },
      })
        .on(e);
    },
  );

  await t.should(
    "work with injections",
    async () => {
      await gql`
        query {
          injectionInherit (
            student: {
              name: "Kyle"
            }
          ) {
            student {
              id
              name
              infos { age school }
            }
            grades {
              year
              subjects { name score }
            }
          }
        }
      `
        .withContext({
          subjects: [
            { name: "Math", score: 24 },
            { name: "English", score: 68 },
          ],
          personalInfos: { age: 17 },
        })
        .expectData({
          injectionInherit: {
            student: {
              id: 1234, // from reduce
              name: "Kyle", // from user
              infos: { age: 17 }, // from context
            },
            grades: {
              year: 2000, // from explicit injection set(..)
              subjects: [ // from context
                { name: "Math", score: 24 },
                { name: "English", score: 68 },
              ],
            },
          },
        })
        .on(e);
    },
  );
});

Meta.test("python(sdk): reduce", async (t) => {
  const e = await t.engine("typecheck/reduce.py");
  await t.should(
    "work as normal if all nodes have g.inherit() flag",
    async () => {
      await gql`
        query {
          invariantReduce (
            one: "1"
            two: {
              reduce: 2
              set: 3
              user: 4
              context: "5"
            }
          ) {
            one
            two {
              reduce
              set
              user
              context
            }
          }
        }
      `
        .expectData({
          invariantReduce: {
            one: "1",
            two: {
              reduce: 2,
              set: 3,
              user: 4,
              context: "5",
            },
          },
        })
        .on(e);
    },
  );

  await t.should(
    "work with reduce composition and injections",
    async () => {
      await gql`
        query {
          simpleInjection (
            two: { user: 4444 }
          ) {
            one
            two {
              set
              user
              context
            }
          }
        }
      `
        .withContext({
          someValue: "THREE!!",
        })
        .expectData({
          simpleInjection: {
            one: "ONE!", // reduce
            two: {
              set: 2,
              user: 4444,
              context: "THREE!!",
            },
          },
        })
        .on(e);
    },
  );

  // FIXME: "branching" is still mandatory?
  // await t.should(
  //   "work with nested union/either",
  //   async () => {
  //     await gql`
  //       query {
  //         testBranching {
  //           branching {
  //             ... on V1 { a { b } }
  //             ... on V2 { a {
  //                 b {
  //                   ... on A { c }
  //                   ... on B { c }
  //                 }
  //             }
  //           }
  //         }
  //       }
  //       }
  //     `
  //       .expectData({
  //         simpleInjection: {
  //           branching: {
  //             a: {
  //               b: {
  //                 c: "nested",
  //               },
  //             },
  //           },
  //         },
  //       })
  //       .on(e);
  //   },
  // );

  await t.should(
    "work with self-refering type",
    async () => {
      await gql`
        query {
          selfReferingType (
            a: "A1"
            b: {
              nested: {
                b: {
                  nested: {
                    a: "A3"
                  }
                }
              }
            }
          ) {
            a # A1
            b {
              nested {
                a # A2 (set)
                b {
                  nested {
                    a # A3
                    b {
                      nested {
                        a # A4 (context)
                      }
                    }
                    direct { a }
                  }
                }
              }
            }
          }
        }
      `
        .withContext({
          nestedB: {
            nested: {
              a: "A4 from context",
            },
          },
        })
        .expectData({
          selfReferingType: {
            a: "A1",
            b: {
              nested: {
                a: "A2",
                b: {
                  nested: {
                    a: "A3",
                    b: {
                      nested: {
                        a: "A4 from context",
                      },
                    },
                    direct: {
                      a: "direct A3",
                    },
                  },
                },
              },
            },
          },
        })
        .on(e);
    },
  );
});
