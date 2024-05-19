// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";
import * as path from "std/path/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { denoDirs } from "./deno_dir.ts";
import { generateSyncConfig } from "../../utils/s3.ts";

const cwd = path.join(testDir, "runtimes/deno");
const auth = new BasicAuth("admin", "password");

const localSerializedMemo = denoDirs.serialize({
  prismaMigration: {
    globalAction: {
      create: true,
      reset: false,
    },
    migrationDir: "prisma-migrations",
  },
  dir: cwd,
});
const reusableTgOutput = {
  ...denoDirs,
  serialize: (_: any) => localSerializedMemo,
};

const { syncConfig, cleanUp } = generateSyncConfig("deno-dirs-sync-test");

Meta.test(
  {
    name: "DenoRuntime - Single Replica: support for dirs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with dir on Python SDK",
      async () => {
        const engine = await t.engineFromTgDeployPython(
          "runtimes/deno/deno_dir.py",
          cwd,
        );

        await gql`
          query {
            test_dir(a: 4, b: 3)
          }
        `
          .expectData({
            test_dir: 7,
          })
          .on(engine);
      },
    );

    const port = t.port;
    const gate = `http://localhost:${port}`;

    await t.should(
      "work for deps specified with dir on TypeScript SDK",
      async () => {
        const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
          reusableTgOutput,
          {
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
              dir: cwd,
            },
            typegraphPath: path.join(cwd, "deno_dirs.ts"),
            secrets: {},
          },
        );

        const engine = await t.engineFromDeployed(serialized);

        await gql`
          query {
            testDir(a: 20, b: 5)
          }
        `
          .expectData({
            testDir: 25,
          })
          .on(engine);
      },
    );
  },
);

Meta.test(
  {
    name: "DenoRuntime - Sync mode: support for dirs when adding deps",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    await t.should(
      "work for deps specified with dir on Python SDK",
      async () => {
        const engine = await t.engineFromTgDeployPython(
          "runtimes/deno/deno_dir.py",
          cwd,
        );

        await gql`
          query {
            test_dir(a: 4, b: 3)
          }
        `
          .expectData({
            test_dir: 7,
          })
          .on(engine);
      },
    );

    const port = t.port;
    const gate = `http://localhost:${port}`;

    await t.should(
      "work for deps specified with dir on TypeScript SDK",
      async () => {
        const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
          reusableTgOutput,
          {
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
              dir: cwd,
            },
            typegraphPath: path.join(cwd, "deno_dirs.ts"),
            secrets: {},
          },
        );

        const engine = await t.engineFromDeployed(serialized);

        await gql`
          query {
            testDir(a: 20, b: 5)
          }
        `
          .expectData({
            testDir: 25,
          })
          .on(engine);
      },
    );
  },
);
