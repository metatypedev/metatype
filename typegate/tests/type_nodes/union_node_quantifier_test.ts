// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../utils.ts";

test(
  "Union type",
  async (t) => {
    const e = await t.pythonFile("type_nodes/union_node_quantifier.py");

    await t.should("work with optional", async () => {
      await gql`
          query {
            registerPhone(
              phone: {
                name: "LG",
                camera: 50,
                battery: 5000,
                os: "Android",
              }
            ) {
              message
            }
          }
        `
        .expectData({
          registerPhone: {
            message: "LG registered",
          },
        })
        .on(e);
    });
  },
  { introspection: true },
);
