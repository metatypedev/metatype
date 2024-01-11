// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";
import { mapValues } from "std/collections/map_values.ts";
import { filterKeys } from "std/collections/filter_keys.ts";

Meta.test("planner", async (t) => {
  const e = await t.engine("planner/planner.py");
  const plan = await gql`
    query {
      one {
        id
        email
        nested {
          first
          second
          third
        }
      }
    }
  `
    .planOn(e);

  await t.should("generate the right stages", () => {
    t.assertSnapshot(
      plan.stages.map((s) => ({
        id: s.id(),
        path: s.props.path,
        node: s.props.node,
        type: filterKeys(
          e.tg.type(s.props.typeIdx),
          (k) => ["type", "title", "format"].includes(k),
        ),
      })),
    );
  });

  await t.should("generate the right policy tree", () => {
    const fns = Object.fromEntries(plan.policies.functions);
    t.assertSnapshot(mapValues(fns, (subtree) => {
      const funcType = e.tg.type(subtree.funcTypeIdx);
      return {
        funcType,
        referencedTypes: mapValues(
          Object.fromEntries(subtree.referencedTypes),
          (types) =>
            types.map((idx) =>
              filterKeys(e.tg.type(idx), (k) => ["type", "title"].includes(k))
            ),
        ),
      };
    }));
  });

  await t.should("fail when required selections are missing", async () => {
    await gql`
      query {
        one
      }
    `
      .expectErrorContains("at Q.one: selection set is expected for object")
      .on(e);

    await gql`
      query {
        one {
          nested
        }
      }
    `
      .expectErrorContains("at Q.one.nested: selection set is expected")
      .on(e);
  });

  await t.should("fail for unexpected selections", async () => {
    await gql`
      query {
        one {
          id { id }
        }
      }
    `
      .expectErrorContains("at Q.one.id: Unexpected selection set")
      .on(e);
  });

  await t.should("work with unions", async () => {
    await gql`
      query {
        one {
          union1
          union2 {
            ...on A { a }
            ...on B {
              b {
                ...on C1 { c }
                ...on C2 { c }
              }
            }
          }
        }
      }
    `
      .assertPlanSnapshot(t, e);
  });

  await t.should("work with union dependency", async () => {
    await gql`
      query {
        one {
          from_union2
          from_union1
        }
      }
    `
      .assertPlanSnapshot(t, e);
  });
});

Meta.test("planner: dependencies", async (t) => {
  const e = await t.engine("planner/planner.py");

  await t.should("get the right plan", async () => {
    await gql`
      query {
        two {
          id
          email
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        two {
          id
          email
          profile {
            firstName lastName profilePic
          }
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        two {
          id
          profile {
            firstName lastName profilePic
          }
          email
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        two {
          profile {
            firstName lastName profilePic
          }
          id
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        two {
        taggedPic
          profile {
            firstName lastName profilePic
          }
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        two {
        id
          taggedPic
        }
      }
    `.assertPlanSnapshot(t, e);
  });
});

Meta.test("planner: dependencies in union/either", async (t) => {
  const e = await t.engine("planner/planner.py");

  await t.should("get the right plan", async () => {
    await gql`
      query {
        three {
          id
          user {
            ...on RegisteredUser {
              id
              email
              profile {
                email displayName profilePic
              }
            }
            ...on GuestUser {
              id
            }
          }
        }
      }
    `
      .assertPlanSnapshot(t, e);

    await gql`
      query {
        three {
          id
          user {
            ...on RegisteredUser {
              id
              profile {
                email
                displayName
              }
            }
            ...on GuestUser {
              id
            }
          }
        }
      }
    `
      .assertPlanSnapshot(t, e);
  });
});
