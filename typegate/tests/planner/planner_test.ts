// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { findOperation } from "../../src/graphql.ts";
import { gql, test } from "../utils.ts";
import { None } from "monads";
import { parse } from "graphql";
import { mapValues } from "std/collections/map_values.ts";
import { filterKeys } from "std/collections/filter_keys.ts";

test("planner", async (t) => {
  const e = await t.pythonFile("planner/planner.py");
  const query = `
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
    `;

  const [op, frags] = findOperation(parse(query), None);
  const [plan] = await e.getPlan(op.unwrap(), frags, false, false);

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
});
