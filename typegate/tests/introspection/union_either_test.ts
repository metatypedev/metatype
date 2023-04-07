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
      .matchSnapshot(t)
      .on(e);
  });
}, { introspection: true });
