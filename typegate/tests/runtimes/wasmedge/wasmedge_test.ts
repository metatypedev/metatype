// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "../../utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { lazyTg } from "./wasmedge.ts";

import * as path from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";
import { assert } from "std/assert/assert.ts";

const port = 7698;
const gate = `http://localhost:${port}`;
const cwdDir = testDir;
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

Meta.test("WasmEdge Runtime typescript sdk", async (metaTest) => {
  await metaTest.should("build mdk project", async () => {
    const proc = await (new Deno.Command("cargo", {
      args: "build --target wasm32-wasi".split(/\s+/),
      cwd: path.join(testDir, "runtimes/wasmedge/mdk"),
    }).output());

    console.error("sucess", new TextDecoder().decode(proc.stdout));
    console.error("error", new TextDecoder().decode(proc.stderr));

    assert(
      exists(
        path.join(
          testDir,
          "runtimes/wasmedge/mdk/target/wasm32-wasi/debug/mat_rust.wasm",
        ),
      ),
    );
  });

  await metaTest.should("work after deploying artifact", async () => {
    const tg = await lazyTg();
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
