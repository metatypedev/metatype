// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";

Meta.test({
  name: "Union type",
  introspection: true,
}, async (t) => {
  const e = await t.engine(
    "type_nodes/union_node_attr.py",
  );

  await t.should("be normalized and represented as rgb color", async () => {
    await gql`
      query {
        normalize(x: 8, y: 0, z: 6, as: "color") {
          ... on Rgb { R G B }
          ... on Vec { x y z }
          ... on AxisPair {
            xy { first second }
            xz { first second }
            yz { first second }
          }
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
          ... on Rgb { R G B }
          ... on Vec { x y z }
          ... on AxisPair {
            xy { first second }
            xz { first second }
            yz { first second }
          }
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
            ... on Rgb { R }
            ... on Vec { x }
            ... on AxisPair {
              xy { first }
              xz { first }
              yz { first }
            }
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
          ... on Rgb { R G B }
          ... on Vec { x y z }
          ... on AxisPair {
            xy { first }
            xz { first second }
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
});
