// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasmedge.ts";
import * as path from "std/path/mod.ts";

const cwd = path.join(testDir, "runtimes/wasmedge");

Meta.test(
  {
    name: "WasmEdge runtime: Python SDK",
    port: true,
    systemTypegraphs: true,
  },
  async (t) => {
    await t.should("works on the Python SDK", async () => {
      const engine = await t.engineFromTgDeploy(
        "runtimes/wasmedge/wasmedge.py",
        cwd,
      );

      await gql`
      query {
        test(a: 1, b: 2)
      }
    `
        .expectData({
          test: 3,
        })
        .on(engine);
    });
  },
);

Meta.test({
  name: "WasmEdge Runtime typescript sdk",
  port: true,
  systemTypegraphs: true,
}, async (metaTest) => {
  await metaTest.should("work after deploying artifact", async () => {
    const engine = await metaTest.engineFromTgDeploy(
      "runtimes/wasmedge/wasmedge.ts",
      cwd,
      tg, // tg should be provided for TS SDK typegraph
    );

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
