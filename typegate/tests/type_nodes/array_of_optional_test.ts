// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("array of optional", async (t) => {
  const e = await t.pythonFile("type_nodes/array_of_optional.py");
  await t.should("work with array of optional scalars", async () => {
    await gql`
        query {
          test(
            string_array: ["one", "two"],
            integer_array: [1, 2],
            enum_array: ["A", "B", "A"],
            union_array: [1, "two", 3]
          ) {
            integer_array
            string_array
            enum_array
            # union_array # TODO
          }
        }
      `
      .expectData({
        test: {
          string_array: ["one", "two"],
          integer_array: [1, 2],
          enum_array: ["A", "B", "A"],
          // union_array: [1, "two", 3],
        },
      })
      .on(e);
  });
  await t.should("work with array of objects", async () => {
    await gql`
        query {
          test(
            struct_array: [
              {a: "one", b: 1, c: {c1: "any1"}}, 
              {a: "two", b: 2, c: {c1: "any2"}}
            ],
          ) {
            struct_array {
              b
              c { c1 }
            }
          }
        }
      `
      .expectData({
        test: {
          struct_array: [
            {
              b: 1,
              c: { c1: "any1" },
            },
            {
              b: 2,
              c: { c1: "any2" },
            },
          ],
        },
      })
      .on(e);
  });
}, { introspection: true });
