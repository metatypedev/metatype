// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "../../utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasmedge.ts";

const port = 7698;
const gate = `http://localhost:${port}`;
const cwdDir = testDir;
const auth = new BasicAuth("admin", "password");

// Meta.test("WasmEdge runtime: Python SDK", async (t) => {
//   await t.should("works on the Python SDK", async () => {
//     const serialized = await t.serializeTypegraphFromShell(
//       "runtimes/wasmedge/wasmedge.py",
//       SDKLangugage.Python,
//     );

//     const engine = await t.engineFromDeployed(serialized);

//     await gql`
//       query {
//         test(a: 1, b: 2)
//       }
//     `
//       .expectData({
//         test: 3,
//       })
//       .on(engine);
//     await engine.terminate();
//   });
// }, { port: port });

Meta.test("WasmEdge Runtime typescript sdk", async (metaTest) => {
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
}, { port: port, systemTypegraphs: true });
