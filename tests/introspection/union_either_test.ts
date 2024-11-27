// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "../utils/mod.ts";

// https://github.com/graphql/graphql-js/blob/main/src/__tests__/starWarsIntrospection-test.ts

Meta.test({
  name: "Basic introspection",
  introspection: true,
}, async (t) => {
  const e = await t.engine("introspection/union_either.py");
  await t.should("allow querying the schema for query type", async () => {
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
            fields {
              name
            }
          }
        }
      }
    `
      .matchOkSnapshot(t)
      .on(e);
  });
});
