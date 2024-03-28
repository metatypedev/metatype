// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";

import * as path from "std/path/mod.ts";
import { exists } from "std/fs/exists.ts";
import { assert } from "std/assert/assert.ts";

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

Meta.test("WasmEdge Runtime typescript sdk", async (metaTest) => {
  const mdkCli = async (cmd: string, args: string) => {
    console.log("===========");
    console.log(`${cmd} ${args}`);
    const proc = await (new Deno.Command(cmd, {
      args: args.split(/\s+/),
      cwd: path.join(testDir, "runtimes/wasmedge/mdk"),
    }).output());

    console.error("stdout", new TextDecoder().decode(proc.stdout));
    console.error("stderr", new TextDecoder().decode(proc.stderr));
  };

  await metaTest.should("build mdk project", async () => {
    await mdkCli("cargo", "build --target wasm32-wasi");
    const binPath = path.join(
      testDir,
      "runtimes/wasmedge/mdk/target/wasm32-wasi/debug/mat_rust.wasm",
    );
    const _outPath = path.join(
      testDir,
      "runtimes/wasmedge/mdk_component.wasm",
    );
    assert(exists(binPath));

    // await mdkCli("jco", `print ${binPath}`); // explore .wat
  });

  const port = metaTest.port;
  const gate = `http://localhost:${port}`;

  await metaTest.should("work after deploying artifact", async () => {
    const { tg } = await import("./wasmedge.ts");
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
        test_mdk_ts(a: 11, b: 2)
      }
    `
      .expectData({
        test_wasi_ts: 13,
      })
      .on(engine);
    await engine.terminate();
  });
}, { port: true, systemTypegraphs: true });
