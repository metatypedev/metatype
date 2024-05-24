// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "../../utils/mod.ts";
import { generateSyncConfig } from "../../utils/s3.ts";

const { syncConfig, cleanUp } = generateSyncConfig("python-globs-sync-test");

Meta.test(
  {
    name: "PythonRuntime - Single Replica: support for globs when adding deps",
  },
  async (t) => {
    await t.should(
      "work for deps specified with glob on Python SDK",
      async () => {
        const engine = await t.engine(
          "runtimes/python/python_globs.py",
        );

        await gql`
          query {
            test_glob(name: "Pep")
          }
        `
          .expectData({
            test_glob: "Hello Pep",
          })
          .on(engine);
      },
    );

    await t.should(
      "work for deps specified with glob on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/python/python_globs.ts");

        await gql`
          query {
            testGlob(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            testGlob: {
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
    name: "PythonRuntime - Sync mode: support for globs when adding deps",
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
      "work for deps specified with glob on Python SDK",
      async () => {
        const engine = await t.engine(
          "runtimes/python/python_globs.py",
        );

        await gql`
          query {
            test_glob(name: "Pep")
          }
        `
          .expectData({
            test_glob: "Hello Pep",
          })
          .on(engine);
      },
    );

    await t.should(
      "work for deps specified with glob on TypeScript SDK",
      async () => {
        const engine = await t.engine("runtimes/python/python_globs.ts");

        await gql`
          query {
            testGlob(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            testGlob: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(engine);
      },
    );
  },
);
