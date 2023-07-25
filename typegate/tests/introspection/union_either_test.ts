// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../utils/mod.ts";

// https://github.com/graphql/graphql-js/blob/main/src/__tests__/starWarsIntrospection-test.ts

Meta.test("Basic introspection", async (t) => {
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
}, { introspection: true });
