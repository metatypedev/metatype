// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasmedge.ts";
import * as path from "std/path/mod.ts";

const cwdDir = path.join(testDir, "runtimes/wasmedge");
const auth = new BasicAuth("admin", "password");

// Meta.test("WasmEdge runtime", async (t) => {
//   const e = await t.engine("runtimes/wasmedge/wasmedge.py", {}, { port });

//   await t.should("works", async () => {
//     await gql`
//       query {
//         test(a: 1, b: 2)
//       }
//     `
//       .expectData({
//         test: 3,
//       })
//       .on(e);
//   });
// }, { port: port });

Meta.test({
  name: "WasmEdge Runtime typescript sdk",
  port: true,
  systemTypegraphs: true,
}, async (metaTest) => {
  const port = metaTest.port;
  const gate = `http://localhost:${port}`;

  await metaTest.should("work after deploying artifact", async () => {
    const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
      baseUrl: gate,
      auth,
      artifactsConfig: {
        prismaMigration: {
          globalAction: {
            create: true,
            reset: false,
          },
          migrationDir: "prisma-migrations",
        },
        dir: cwdDir,
      },
      secrets: {},
    });

    const engine = await metaTest.engineFromDeployed(serialized);

    await gql`
      query {
        test_wasi_ts(a: 11, b: 2)
      }
    `
      .expectData({
        test_wasi_ts: 13,
      })
      .on(engine);
    await engine.terminate();
  });
});
