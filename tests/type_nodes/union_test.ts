// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { JSONValue } from "@metatype/typegate/utils.ts";
import { gql, Meta } from "../utils/mod.ts";

Meta.test(
  {
    name: "Union type",
    introspection: true,
  },
  async (t) => {
    const e = await t.engine("type_nodes/union_node.py");

    await t.should(
      "allow query with variant colorName of type string in union value Color",
      async () => {
        await gql`
          query {
            convert(color: "blue", to: "rgb_array") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .expectData({
            convert: [0, 0, 255],
          })
          .on(e);
      },
    );

    await t.should(
      "allow query with variant HEX of type string in union value Color",
      async () => {
        await gql`
          query {
            convert(color: "#ffffff", to: "rgb_array") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .expectData({
            convert: [255, 255, 255],
          })
          .on(e);
      },
    );

    await t.should(
      "allow query with variant RGB of type array in union value Color",
      async () => {
        await gql`
          query {
            convert(color: [220, 20, 60], to: "hex") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .expectData({
            convert: "#dc143c",
          })
          .on(e);
      },
    );

    await t.should(
      "allow query with variant RGB of type struct in union value Color",
      async () => {
        await gql`
          query {
            convert(color: { r: 155, g: 38, b: 182 }, to: "rgb_struct") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .expectData({
            convert: {
              r: 155,
              g: 38,
              b: 182,
            },
          })
          .on(e);
      },
    );

    await t.should(
      "return only the selected fields when the returned value is an object",
      async () => {
        await gql`
          query {
            convert(color: { r: 155, g: 38, b: 182 }, to: "rgb_struct") {
              ... on RGBStruct {
                r
              }
            }
          }
        `
          .expectData({
            convert: {
              r: 155,
            },
          })
          .on(e);
      },
    );

    await t.should(
      "fail to query with a type not present in union type Color",
      async () => {
        await gql`
          query {
            convert(color: 100, to: "rgb_array") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .expectErrorContains("Type mismatch: got 'IntValue'")
          .on(e);
      },
    );

    await t.should(
      "fail to query if the value does not match a variant type",
      async () => {
        await gql`
          query {
            convert(color: "hello world", to: "rgb_array") {
              ... on RGBStruct {
                r
                g
                b
              }
            }
          }
        `
          .matchErrorSnapshot(t)
          .on(e);
      },
    );

    await t.should("allow to introspect the union type", async () => {
      await gql`
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
              possibleTypes {
                name
                kind
              }
            }
          }
        }
      `
        .matchOkSnapshot(t)
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "nested unions",
  },
  async (t) => {
    const e = await t.engine("type_nodes/union_node.py");

    await t.should("support nested unions", async () => {
      const data: JSONValue = [
        { b: "Hello" },
        { a: { b: "Hello" } },
        { a: { a: { s: "World" } } },
        { a: { a: { i: 12, j: 15 } } },
      ];
      await gql`
        query Q($inp: [NestedUnionsIn]) {
          nested(inp: $inp) {
            ... on A1 {
              a {
                ... on A2 {
                  a {
                    ... on A3 {
                      s
                    }
                    ... on A4 {
                      i
                      j
                    }
                  }
                }
                ... on B {
                  b
                }
              }
            }
            ... on B {
              b
            }
          }
        }
      `
        .withVars({
          inp: data,
        })
        .expectData({
          nested: data,
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "multilevel unions",
  },
  async (t) => {
    const e = await t.engine("type_nodes/union_node.py");

    await t.should("success", async () => {
      const data: JSONValue = [
        { a: "a" },
        { b: "b" },
        { c: "c" },
        { d: "d" },
        { e: "e" },
        { f: "f" },
      ];

      await gql`
        query Q($inp: [MultilevelUnionIn]!) {
          multilevel(inp: $inp) {
            ... on Ua {
              a
            }
            ... on Ub {
              b
            }
            ... on Uc {
              c
            }
            ... on Ud {
              d
            }
            ... on Ue {
              e
            }
            ... on Uf {
              f
            }
          }
        }
      `
        .withVars({
          inp: data,
        })
        .expectData({
          multilevel: data,
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "scalar unions",
  },
  async (t) => {
    const e = await t.engine("type_nodes/union_node.py");

    await t.should("succeed", async () => {
      const data: JSONValue = [1, "hello", 12, false];
      await gql`
        query Q($inp: [MultilevelUnionIn]) {
          scalar(inp: $inp)
        }
      `
        .withVars({
          inp: data,
        })
        .expectData({
          scalar: data,
        })
        .on(e);
    });
  },
);
