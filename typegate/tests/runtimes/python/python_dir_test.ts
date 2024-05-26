// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";
import { generateSyncConfig } from "../../utils/s3.ts";

const { syncConfig, cleanUp } = generateSyncConfig("python-dirs-sync-test");

Meta.test(
  {
    name: "PythonRuntime - Single Replica: support for dirs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with dir on Python SDK",
      async () => {
        const engine = await t.engine(
          "runtimes/python/python_dir.py",
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

    await t.should(
      "work for deps specified with dir on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/python/python_dir.ts");

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
        const engine = await t.engine(
          "runtimes/python/python_dir.py",
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

    await t.should(
      "work for deps specified with dir on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/python/python_dir.ts");

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
