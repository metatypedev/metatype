// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test("array of optional", async (t) => {
  const e = await t.pythonFile("type_nodes/array_of_optional.py");
  await t.should("work with array of optional scalars", async () => {
    await gql`
        query {
          test(
            string_array: ["one", "two", null],
            integer_array: [1, 2, null],
            enum_array: ["A", "B", "A"],
            union_array: [1, "two", 3]
          ) {
            integer_array
            string_array
            enum_array
            union_array
          }
        }
    `.expectData({
      test: {
        string_array: ["one", "two", null],
        integer_array: [1, 2, null],
        enum_array: ["A", "B", "A"],
        union_array: [1, "two", 3],
      },
    })
      .on(e);
  });

  await t.should("work with array of objects and null", async () => {
    await gql`
        query {
          test(
            struct_array: [
              null,
              {
                a: "one", b: 1, 
                c: { c1: "any1", inner: [null, "any"] }
              }, 
              {
                a: "two", b: 2, 
                c: { c1: "any2",  inner: ["any"] }
              }
            ],
          ) {
            struct_array {
              b
              c { c1 inner }
            }
          }
        }
    `.expectData({
      test: {
        struct_array: [
          null,
          { b: 1, c: { c1: "any1", inner: [null, "any"] } },
          { b: 2, c: { c1: "any2", inner: ["any"] } },
        ],
      },
    })
      .on(e);
  });

  await t.should("not work with non nullable array values", async () => {
    await gql`
        query {
          testNonNull(
            struct_array: [{x: "any"}, {x: "any2"}, null],
            string_array: ["one", "two", null],
            integer_array: [1, 2, null],
          ) {
            integer_array
            struct_array
            string_array
          }
        }
    `.matchErrorSnapshot(t)
      .on(e);
  });
}, { introspection: true });
