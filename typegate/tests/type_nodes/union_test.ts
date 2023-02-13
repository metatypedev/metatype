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
            convert(color: "blue", to: "rgb")
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
            convert(color: "#ffffff", to: "rgb")
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
      "fail to query with a type not present in union type Color",
      async () => {
        await gql`
          query {
            convert(color: 100, to: "rgb")
          }
        `
          .expectErrorContains(
            "Type mismatch: got 'IntValue' but expected 'ARRAY' or 'STRING' for argument 'color' named as 'Color'",
          )
          .on(e);
      },
    );

    await t.should(
      "fail to query if the value does not match a variant type",
      async () => {
        await gql`
          query {
            convert(color: "hello world", to: "rgb")
          }
        `
          .expectErrorContains(
            [
              `must be array`,
              `must match pattern "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"`,
              `must be equal to one of the allowed values: red, green, blue, black, white`,
            ].join(" or "),
          )
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
        .expectBody((body: { data: string }) => {
          t.assertSnapshot(body.data);
        })
        .on(e);
    });
  },
  { introspection: true },
);
