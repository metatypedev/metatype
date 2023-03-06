// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { gql, test } from "../../utils.ts";

test("WasmEdge runtime", async (t) => {
  const e = await t.pythonFile("runtimes/wasmedge/wasmedge.py");

  await t.should("works", async () => {
    await gql`
      query {
        test(a: 1, b: 2)
      }
    `
      .expectData({
        test: 3,
      })
      .on(e);
  });
});
