// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";

Meta.test({ name: "Grpc Runtime" }, async (t) => {
  const e = await t.engine("runtimes/grpc/grpc.py");

  await t.should("", async () => {
    await gql`
      query {
        greet(name: "Metatype") {
          message
        }
      }
    `
      .expectData({
        message: "Hello Metatype",
      })
      .on(e);
  });
});
