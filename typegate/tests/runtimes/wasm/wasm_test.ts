// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasm.ts";
import * as path from "std/path/mod.ts";

const cwdDir = path.join(testDir, "runtimes/wasm");
const auth = new BasicAuth("admin", "password");

// Meta.test("Wasm runtime", async (t) => {
//   const e = await t.engine("runtimes/wasm/wasm.py", {}, { port });

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
  name: "Wasm Runtime typescript sdk",
  port: true,
  systemTypegraphs: true,
}, async (metaTest) => {
  const port = metaTest.port;
  const gate = `http://localhost:${port}`;

  await metaTest.should("work after deploying artifact", async (t) => {
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

    await t.step("wit bindings", async () => {
      await gql`
          query {
            testWitAdd(a: 11, b: 2)
            testWitList(a: 1, b: 4)
          }
      `
        .expectData({
          testWitAdd: 13,
          testWitList: [1, 2, 3, 4],
        })
        .on(engine);
    });

    await t.step("wit error should propagate gracefully", async () => {
      await gql`
        query {
          testWitList(a: 100, b: 1)
        }
      `
        .expectErrorContains("invalid range: 100 > 1")
        .on(engine);
    });

    // await t.step(
    //   "nested wit output value should deserialize properly",
    //   async () => {
    //     await gql`
    //     query {
    //       copmlexType()
    //     }
    //   `
    //       .expectBody((body) => {
    //         console.log(body);
    //       })
    //       .on(engine);
    //   },
    // );

    await engine.terminate();
  });
});
