// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { testDir } from "test-utils/dir.ts";
import { gql, Meta } from "../utils/mod.ts";
import * as path from "std/path/mod.ts";

const cwd = path.join(testDir, "type_nodes");

Meta.test({
  name: "Union type",
  introspection: true,
  port: true,
  systemTypegraphs: true,
}, async (t) => {
  const e = await t.engineFromTgDeployPython(
    "type_nodes/union_node_attr.py",
    cwd,
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
