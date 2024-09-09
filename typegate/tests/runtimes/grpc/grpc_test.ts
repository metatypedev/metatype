// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";

Meta.test({ name: "Grpc Runtime" }, async (t) => {
  const hello_world = await t.engine("runtimes/grpc/helloworld.py");

  await t.should("Say Hello", async () => {
    await gql`
      query {
        greet(name: "Metatype") {
          message
        }
      }
    `
      .expectData({
        greet: {
          message: "Hello Metatype",
        },
      })
      .on(hello_world);
  });

  const maths = await t.engine("runtimes/grpc/maths.py");

  await t.should("Sum number", async () => {
    await gql`
      query {
        sum(list: [1, 2, 3, 4]) {
          total
        }
      }
    `
      .expectData({
        sum: {
          total: 10,
        },
      })
      .on(maths);
  });
});
