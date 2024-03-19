// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";

Meta.test("WasmEdge runtime", async (t) => {
  const e = await t.engine("runtimes/wasmedge/wasmedge.py", { deploy: true });

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

Meta.test("WasmEdge Runtime typescript sdk", async (metaTest) => {
  const engine = await metaTest.engine("runtimes/wasmedge/wasmedge.ts", {
    deploy: true,
  });

  await metaTest.should("work", async () => {
    await gql`
      query {
        test_wasi_ts(a: 11, b: 2)
      }
    `
      .expectData({
        test_wasi_ts: 13,
      })
      .on(engine);
  });
});
