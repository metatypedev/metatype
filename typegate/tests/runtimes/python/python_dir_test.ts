// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";
import * as path from "std/path/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { generateSyncConfig } from "../../utils/s3.ts";
import { pythonDirs } from "./python_dirs.ts";

const cwd = path.join(testDir, "runtimes/python");
const auth = new BasicAuth("admin", "password");

const localSerializedMemo = pythonDirs.serialize({
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
  ...pythonDirs,
  serialize: (_: any) => localSerializedMemo,
};

const { syncConfig, cleanUp } = generateSyncConfig("python-dirs-sync-test");

Meta.test(
  {
    name: "PythonRuntime - Single Replica: support for dirs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with dir on Python SDK",
      async () => {
        const engine = await t.engineFromTgDeployPython(
          "runtimes/python/python_dirs.py",
          cwd,
        );

        await gql`
          query {
            test_dir(name: "Jurgen")
          }
        `
          .expectData({
            test_dir: "Hello Jurgen",
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
            typegraphPath: path.join(cwd, "python_dirs.ts"),
            secrets: {},
          },
        );

        const engine = await t.engineFromDeployed(serialized);

        await gql`
          query {
            testDir(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            testDir: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(engine);
      },
    );
  },
);

Meta.test(
  {
    name: "PythonRuntime - Sync mode: support for dirs when adding deps",
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
          "runtimes/python/python_dirs.py",
          cwd,
        );

        await gql`
          query {
            test_dir(name: "Jurgen")
          }
        `
          .expectData({
            test_dir: "Hello Jurgen",
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
            typegraphPath: path.join(cwd, "python_dirs.ts"),
            secrets: {},
          },
        );

        const engine = await t.engineFromDeployed(serialized);

        await gql`
          query {
            testDir(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            testDir: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(engine);
      },
    );
  },
);
