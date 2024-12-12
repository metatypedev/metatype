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
      control_value: "ALLOW"
    })
      .expectData({
        simple_traversal_comp: {
          one: {
            two: 2,
            three: "three"
          }
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
      control_value: "PASS"
    })
      .expectErrorContains("('either') at '<root>.simple_traversal_comp.one.two'")
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
      control_value: "DENY"
    })
      .expectErrorContains("('object') at '<root>.simple_traversal_comp.one'")
      .on(e);
  });
});



Meta.test("Basic chain composition on a single field spec", async (t) => {
  const e = await t.engine("policies/policies_composition.py");

  await t.should("have PASS not affecting the outcome (version 1)", async () => {
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
      C: "PASS"
    })
      .expectData({
        single_field_comp: {
          abc: "enter"
        }
      })
      .on(e);
  });


  await t.should("have PASS not affecting the outcome (version 2)", async () => {
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
      C: "PASS"
    })
      .expectErrorContains("Authorization failed for policy 'B'")
      .on(e);
  });


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
      C: "ALLOW"
    })
      .expectErrorContains("Authorization failed for policy 'B'")
      .on(e);
  });
});
