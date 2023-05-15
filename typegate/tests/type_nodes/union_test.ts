// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { JSONValue } from "../../src/utils.ts";
import { gql, test } from "../utils.ts";

test(
  "Union type",
  async (t) => {
    const e = await t.pythonFile("type_nodes/union_node.py");

    await t.should(
      "allow query with variant colorName of type string in union value Color",
      async () => {
        await gql`
          query {
            convert(color: { name: "blue" }, to: "rgb_array") {
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
            }
          }
        `
          .expectData({
            convert: { rgb: [0, 0, 255] },
          })
          .on(e);
      },
    );

    await t.should(
      "allow query with variant HEX of type string in union value Color",
      async () => {
        await gql`
          query {
            convert(color: { hex: "#ffffff" }, to: "rgb_array") {
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
            }
          }
        `
          .expectData({
            convert: { rgb: [255, 255, 255] },
          })
          .on(e);
      },
    );

    await t.should(
      "allow query with variant RGB of type array in union value Color",
      async () => {
        await gql`
          query {
            convert(color: { rgb: [220, 20, 60] }, to: "hex") {
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
            }
          }
        `
          .expectData({
            convert: { hex: "#dc143c" },
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
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
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
              ... on RGBArray { rgb }
              ... on RGBStruct { r }
              ... on HexColor { hex }
              ... on NamedColor { name }
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
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
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
              ... on RGBArray { rgb }
              ... on RGBStruct { r g b }
              ... on HexColor { hex }
              ... on NamedColor { name }
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
        .matchSnapshot(t)
        .on(e);
    });
  },
  { introspection: true },
);

test("nested unions", async (t) => {
  const e = await t.pythonFile("type_nodes/union_node.py");

  await t.should("support nested unions", async () => {
    const data: JSONValue = [
      { b: "Hello" },
      { a: { b: "Hello" } },
      { a: { a: { s: "World" } } },
      { a: { a: { i: 12, j: 15 } } },
    ];
    await gql`
      query Q($inp: [NestedUnionsInp]) {
        nested(inp: $inp) {
          ... on A1 {
            a {
              ... on A2 {
                a {
                  ... on A3 { s }
                  ... on A4 { i j }
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
});
