// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

// https://github.com/graphql/graphql-js/blob/main/src/__tests__/starWarsIntrospection-test.ts

test("Basic introspection", async (t) => {
  const e = await t.pythonFile("introspection/union_either.py");

  await t.should("allow querying the schema for query type", async () => {
    await gql`
      query IntrospectionQuery {
        __schema {
          types {
            name
            kind
            fields {
              name
            }
          }
        }
      }
    `
      .expectData({
        __schema: {
          types: [
            { name: "String", fields: null, kind: "SCALAR" },
            { name: "Int", fields: null, kind: "SCALAR" },
            { name: "Query", fields: [{ name: "test" }], kind: "OBJECT" },
            {
              name: "Output",
              fields: [{ name: "favorite" }, { name: "name" }],
              kind: "OBJECT",
            },
            {
              name: "FavoriteToy",
              fields: [{ name: "either_2" }, { name: "either_1" }, {
                name: "either_0",
              }],
              kind: "OBJECT",
            },
            {
              name: "Rubix",
              fields: [{ name: "size" }, { name: "name" }],
              kind: "OBJECT",
            },
            { name: "Toygun", fields: [{ name: "color" }], kind: "OBJECT" },
            {
              name: "Gunpla",
              fields: [{ name: "ref" }, { name: "model" }],
              kind: "OBJECT",
            },
            {
              name: "union_9",
              fields: [{ name: "union_1" }, { name: "union_0" }],
              kind: "OBJECT",
            },
            { name: "FavoriteToyInp", fields: null, kind: "INPUT_OBJECT" },
            { name: "RubixInp", fields: null, kind: "INPUT_OBJECT" },
            { name: "ToygunInp", fields: null, kind: "INPUT_OBJECT" },
            { name: "GunplaInp", fields: null, kind: "INPUT_OBJECT" },
            { name: "union_9Inp", fields: null, kind: "INPUT_OBJECT" },
          ],
        },
      })
      .on(e);
  });
}, { introspection: true });
