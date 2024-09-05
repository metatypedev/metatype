// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta, sleep } from "../../utils/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";
import { assert, assertEquals } from "@std/assert";
import { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";

const redisKey = "typegraph";
const redisEventKey = "typegraph_event";

async function cleanUp() {
  using redis = await connect(syncConfig.redis);
  await redis.del(redisKey);
  await redis.del(redisEventKey);

  const s3 = new S3Client(syncConfig.s3);
  await tryDeleteBucket(s3, syncConfig.s3Bucket);
  await createBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
  await redis.quit();
}

const syncConfig = {
  redis: {
    hostname: "localhost",
    port: 6379,
    password: "password",
    db: 2,
  },
  s3: {
    endpoint: "http://localhost:9000",
    region: "local",
    credentials: {
      accessKeyId: "minio",
      secretAccessKey: "password",
    },
    forcePathStyle: true,
  },
  s3Bucket: "metatype-python-runtime-sync-test",
};

Meta.test(
  {
    name: "Python Runtime typescript SDK: with Sync Config",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (metaTest) => {
    await metaTest.should(
      "work after deploying python artifacts to S3",
      async () => {
        const s3 = new S3Client(syncConfig.s3);

        const engine = await metaTest.engine("runtimes/python/python.ts");

        const s3Objects = await listObjects(s3, syncConfig.s3Bucket);
        // two objects, 2 artifacts and the 2 typegraphs; why 2 typegraphs??
        assertEquals(s3Objects?.length, 4);

        await gql`
          query {
            identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
            identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
            identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            identityDef: {
              a: "hello",
              b: [1, 2, "three"],
            },
            identityLambda: {
              a: "hello",
              b: [1, 2, "three"],
            },
            identityMod: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(engine);

        s3.destroy();
      },
    );
  },
);

Meta.test(
  {
    name: "Python runtime: sync mode",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const e = await t.engine("runtimes/python/python.py");

    await t.should("work once (lambda)", async () => {
      await gql`
        query {
          test(a: "test")
        }
      `
        .expectData({
          test: "test",
        })
        .on(e);
    });

    await t.should("work once (def)", async () => {
      await gql`
        query {
          testDef(a: "test")
        }
      `
        .expectData({
          testDef: "test",
        })
        .on(e);
    });

    await t.should("work once (module)", async () => {
      await gql`
        query {
          testMod(name: "Loyd")
        }
      `
        .expectData({
          testMod: "Hello Loyd",
        })
        .on(e);
    });

    await t.should("return same object", async () => {
      await gql`
        query {
          identity(input: { a: 1234, b: { c: ["one", "two", "three"] } }) {
            a
            b {
              c
            }
          }
        }
      `
        .expectData({
          identity: {
            a: 1234,
            b: { c: ["one", "two", "three"] },
          },
        })
        .on(e);
    });

    await t.should("work fast enough", async () => {
      const tests = [...Array(100).keys()].map((i) =>
        gql`
          query ($a: String!) {
            test(a: $a)
          }
        `
          .withVars({
            a: `test${i}`,
          })
          .expectData({
            test: `test${i}`,
          })
          .on(e)
      );

      const start = performance.now();
      await Promise.all(tests);
      const end = performance.now();
      const duration = end - start;

      console.log(`duration: ${duration}ms`);
      assert(duration < 800, `Python runtime was too slow: ${duration}ms`);
    });
  },
);

Meta.test(
  {
    name: "Python runtime: multiple typegate instances sync mode",
    replicas: 3,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const testMultipleReplica = async (instanceNumber: number) => {
      const e = await t.engine("runtimes/python/python.py");

      await sleep(5_000);

      await t.should(
        `work on the typgate instance #${instanceNumber}`,
        async () => {
          await gql`
            query {
              testMod(name: "Loyd")
            }
          `
            .expectData({
              testMod: `Hello Loyd`,
            })
            .on(e);
        },
      );
    };

    await testMultipleReplica(1);
    await testMultipleReplica(2);
  },
);

Meta.test(
  {
    name: "Python: typegate reloading in sync mode",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (metaTest) => {
    const load = async () => {
      return await metaTest.engine("runtimes/python/python.ts");
    };

    const runPythonOnPython = async (currentEngine: QueryEngine) => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
          identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityDef: {
            a: "hello",
            b: [1, 2, "three"],
          },
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
          identityMod: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(currentEngine);
    };
    const engine = await load();
    await metaTest.should("work before typegate is reloaded", async () => {
      await runPythonOnPython(engine);
    });

    // reload
    const reloadedEngine = await load();

    await metaTest.should("work after typegate is reloaded", async () => {
      await runPythonOnPython(reloadedEngine);
    });
  },
);

Meta.test(
  {
    name:
      "PythonRuntime - Python SDK: typegraph with no artifacts in sync mode",
    sanitizeOps: false,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const e = await t.engine("runtimes/python/python_no_artifact.py");

    await t.should(
      "work when there are no artifacts in the typegraph: python SDK, in sync mode",
      async () => {
        await gql`
          query {
            test_lambda(a: "test")
          }
        `
          .expectData({
            test_lambda: "test",
          })
          .on(e);
      },
    );
  },
);

Meta.test(
  {
    name: "Python Runtime TS SDK: typegraph with no artifacts in sync mode",
    sanitizeOps: false,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const e = await t.engine("runtimes/python/python_no_artifact.ts");

    await t.should(
      "work when there are no artifacts in the typegraph: TS SDK, in sync mode",
      async () => {
        await gql`
          query {
            identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
            identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            identityDef: {
              a: "hello",
              b: [1, 2, "three"],
            },
            identityLambda: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(e);
      },
    );
  },
);

Meta.test(
  {
    name:
      "Python - Python SDK: typegraph with duplicate artifact uploads in sync mode",
    sanitizeOps: false,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const e = await t.engine("runtimes/python/python_duplicate_artifact.py");

    await t.should(
      "work when there is duplicate artifacts uploads: Python SDK, in sync mode",
      async () => {
        await gql`
          query {
            testMod(name: "Loyd")
            testModDuplicate(name: "Barney")
          }
        `
          .expectData({
            testMod: "Hello Loyd",
            testModDuplicate: "Hello Barney",
          })
          .on(e);
      },
    );
  },
);

Meta.test(
  {
    name:
      "Python Runtime - TS SDK: typegraph with duplicate artifact uploads in sync mode",
    sanitizeOps: false,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t) => {
    const e = await t.engine("runtimes/python/python_duplicate_artifact.ts");

    await t.should(
      "work when there is duplicate artifacts uploads: TS SDK, in sync mode",
      async () => {
        await gql`
          query {
            identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
            identityModDuplicate(input: { a: "hello", b: [1, 2, "three"] }) {
              a
              b
            }
          }
        `
          .expectData({
            identityMod: {
              a: "hello",
              b: [1, 2, "three"],
            },
            identityModDuplicate: {
              a: "hello",
              b: [1, 2, "three"],
            },
          })
          .on(e);
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
        const engine = await t.engine("runtimes/python/python_dir.py");

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
        const engine = await t.engine("runtimes/python/python_globs.py");

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
