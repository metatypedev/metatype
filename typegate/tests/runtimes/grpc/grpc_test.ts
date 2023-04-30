// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../../utils.ts";

test("Grpc runtime", async (t) => {
  const e = await t.pythonFile("runtimes/grpc/grpc.py");

  await t.should("works", async () => {
    await gql`
      query {
        greet(name: "Metatype")
      }
    `
      .expectData({
        greet: "Hello Metatype",
      })
      .on(e);
  });
});
