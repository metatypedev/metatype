// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test("Basic composition through traversal spec", async (t) => {
  const e = await t.engine("policies/policies_composition.py");

  await t.should("allow child if parent is set to 'ALLOW'", async () => {
    await gql`
      query {
        simple_traversal_comp(one: { two: 2, three: "three" }) { # pass
          one {
            two # deny
            three # allow
          } #! allow
        }
      }
    `
      .withContext({
        control_value: "ALLOW",
      })
      .expectData({
        simple_traversal_comp: {
          one: {
            two: 2,
            three: "three",
          },
        },
      })
      .on(e);
  });

  await t.should("have allowed field", async () => {
    await gql`
      query {
        simple_traversal_comp(one: { two: 2, three: "three" }) { # pass
          one {
            # two # deny
            three # allow
          } #! pass
        }
      }
    `
      .withContext({
        control_value: "PASS",
      })
      .expectData({
        simple_traversal_comp: {
          one: {
            three: "three",
          },
        },
      })
      .on(e);
  });

  await t.should("skip parent and go further with 'PASS'", async () => {
    await gql`
      query {
        simple_traversal_comp(one: { two: 2, three: "three" }) { # pass
          one {
            two # deny
            three # allow
          } #! pass
        }
      }
    `
      .withContext({
        control_value: "PASS",
      })
      .expectErrorContains("'<root>.simple_traversal_comp.one.two'")
      .on(e);
  });

  await t.should("deny and stop if parent is set to 'DENY'", async () => {
    await gql`
      query {
        simple_traversal_comp(one: { two: 2, three: "three" }) { # pass
          one {
            two # deny
            three # allow
          } #! deny
        }
      }
    `
      .withContext({
        control_value: "DENY",
      })
      .expectErrorContains("'<root>.simple_traversal_comp.one'")
      .on(e);
  });
});

Meta.test("Basic chain composition on a single field spec", async (t) => {
  const e = await t.engine("policies/policies_composition.py");

  await t.should(
    "have PASS not affecting the outcome (version 1)",
    async () => {
      await gql`
      query {
        single_field_comp(abc: "enter" ) {
          abc
        }
      }
    `
        .withContext({
          A: "PASS",
          B: "ALLOW",
          C: "PASS",
        })
        .expectData({
          single_field_comp: {
            abc: "enter",
          },
        })
        .on(e);
    },
  );

  await t.should(
    "have PASS not affecting the outcome (version 2)",
    async () => {
      await gql`
      query {
        single_field_comp(abc: "enter" ) {
          abc
        }
      }
    `
        .withContext({
          A: "PASS",
          B: "DENY",
          C: "PASS",
        })
        .expectErrorContains("Authorization failed for policy 'B'")
        .on(e);
    },
  );

  await t.should("have DENY ruling", async () => {
    await gql`
      query {
        single_field_comp(abc: "enter" ) {
          abc
        }
      }
    `
      .withContext({
        A: "PASS",
        B: "DENY",
        C: "ALLOW",
      })
      .expectErrorContains("Authorization failed for policy 'B'")
      .on(e);
  });
});

Meta.test("Traversal composition on a per effect policy setup", async (t) => {
  const e = await t.engine("policies/policies_composition.py");

  const inputA = {
    two: {
      three: {
        a: 1,
      },
    },
  };

  const inputB = {
    two: {
      three: {
        b: {
          c: 2,
        },
      },
    },
  };

  await t.should(
    "have PASS acting as a no-op upon traversal (version 1)",
    async () => {
      await gql`
      mutation {
        traversal_comp(one: $one) {
          one {
            two {
              three {
                ... on First { a }
                ... on Second {
                  b {
                    c # d4
                  }
                }
              } # d3
            } # d2
          } # d1
        }
      }
    `
        .withVars({ one: inputA })
        .withContext({
          depth_1: "PASS",
          depth_2: "ALLOW",
          depth_3: "PASS",
          depth_4: "PASS",
        })
        .expectData({
          traversal_comp: {
            one: inputA,
          },
        })
        .on(e);
    },
  );

  await t.should(
    "have PASS acting as a no-op upon traversal (version 2)",
    async () => {
      await gql`
      mutation {
        traversal_comp(one: $one) {
          one {
            two {
              three {
                ... on First { a }
                ... on Second {
                  b {
                    c # d4
                  }
                }
              } # d3
            } # d2
          } # d1
        }
      }
    `
        .withVars({ one: inputA })
        .withContext({
          depth_1: "PASS",
          depth_2: "DENY", // stop!
          depth_3: "ALLOW",
          depth_4: "ALLOW",
        })
        .expectErrorContains("'<root>.traversal_comp.one.two'")
        .on(e);
    },
  );

  await t.should(
    "DENY when a protected field on a either variant is encountered",
    async () => {
      await gql`
      mutation {
        traversal_comp(one: $one) {
          one {
            two {
              three {
                ... on First { a }
                ... on Second {
                  b {
                    c # d4
                  }
                }
              } # d3
            } # d2
          } # d1
        }
      }
    `
        .withVars({ one: inputB })
        .withContext({
          depth_1: "PASS",
          depth_2: "PASS",
          depth_3: "PASS",
          depth_4: "DENY",
        })
        .expectErrorContains("'<root>.traversal_comp.one.two.three$Second.b.c'")
        .on(e);
    },
  );
});
