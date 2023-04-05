// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
            convert(color: "blue", to: "rgb_array")
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
            convert(color: "#ffffff", to: "rgb_array")
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
            convert(color: [220, 20, 60], to: "hex")
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
              r
              g
              b
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
              r
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
            convert(color: 100, to: "rgb_array")
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
            convert(color: "hello world", to: "rgb_array")
          }
        `
          .matchErrorSnapshot(t)
          .on(e);
      },
    );

    // Note:
    // Due to Input compatitbility issues with the current graphql spec
    // Either/Union are seen as `object`
    // when introspected
    await t.should("allow to introspect the union type", async () => {
      await gql`
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
              fields {
                name
                type {
                  kind
                }
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
