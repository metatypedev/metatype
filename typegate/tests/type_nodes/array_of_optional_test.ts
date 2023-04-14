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
            union_array
          }
        }
      `
      .expectBody((body) => {
        console.log(body);
      })
      // .expectData({
      //   test: {
      //     string_array: ["one", "two"],
      //     integer_array: [1, 2],
      //     enum_array: ["A", "B", "A"],
      //     union_array: [1, "two", 3],
      //   },
      // })
      .on(e);
  });
  await t.should("work with array of objects", async () => {
    await gql`
        query {
          test(
            struct_array: [{_: "one"}, {_: "two"}],
          ) {
            struct_array { _ }
          }
        }
      `
      .expectBody((body) => {
        console.log(body);
      })
      // .expectData({
      //   struct_array: [{ _: "one" }, { _: "two" }],
      //   scalar_array: ["one", "two"],
      // })
      .on(e);
  });
}, { introspection: true });
