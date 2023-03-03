// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test(
  "Union type",
  async (t) => {
    const e = await t.pythonFile("type_nodes/union_node_attr.py");

    await t.should("be normalized and represented as rgb color", async () => {
      await gql`
        query {
          normalize(x: 8, y: 0, z: 6, as: "color") {
            R
            G
            B
          }
        }
      `
        .expectData({
          normalize: { R: 0.8, G: 0, B: 0.6 },
        })
        .on(e);
    });

    await t.should("be normalized and represented as vec", async () => {
      await gql`
        query {
          normalize(x: 8, y: 0, z: 6, as: "vec") {
            x
            y
            z
          }
        }
      `
        .expectData({
          normalize: { x: 0.8, y: 0, z: 0.6 },
        })
        .on(e);
    });

    await t.should(
      "be normalized and return the x component only",
      async () => {
        await gql`
          query {
            normalize(x: 8, y: 0, z: 6, as: "vec") {
              x
            }
          }
        `
          .expectData({
            normalize: { x: 0.8 },
          })
          .on(e);
      },
    );

    await t.should("be normalized and represented as AxisPairs", async () => {
      await gql`
        query {
          normalize(x: 8, y: 0, z: 6, as: "pair") {
            xz {
              first
              second
            }
            xy {
              first
            }
          }
        }
      `
        .expectData({
          normalize: {
            xz: { first: 0.8, second: 0.6 },
            xy: { first: 0.8 },
          },
        })
        .on(e);
    });
  },
  { introspection: true },
);
