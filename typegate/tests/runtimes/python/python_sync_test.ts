// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import * as path from "std/path/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";
import { assert, assertEquals, assertExists } from "std/assert/mod.ts";
import { QueryEngine } from "../../../src/engine/query_engine.ts";
import { tg } from "./python.ts";
// import { tgNoArtifact } from './python_no_artifact.ts';

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
    db: 1,
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

const cwd = path.join(testDir, "runtimes/python");
const auth = new BasicAuth("admin", "password");

const localSerializedMemo = tg.serialize({
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
  ...tg,
  serialize: (_: any) => localSerializedMemo,
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
  async (metaTest: any) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    const { serialized, typegate: gateResponseAdd } = await tgDeploy(
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
        typegraphPath: path.join(cwd, "python.ts"),
        secrets: {},
      },
    );

    await metaTest.should(
      "work after deploying python artifacts to S3",
      async () => {
        const s3 = new S3Client(syncConfig.s3);

        assertExists(serialized, "serialized has a value");
        assertEquals(gateResponseAdd, {
          data: {
            addTypegraph: {
              name: "python",
              messages: [],
              migrations: [],
            },
          },
        });

        const s3Objects = await listObjects(s3, syncConfig.s3Bucket);
        // two objects, 2 artifacts and the typegraph
        assertEquals(s3Objects?.length, 3);

        const engine = await metaTest.engineFromDeployed(serialized);

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
  async (t: any) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python/python.py",
      cwd,
    );

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
  async (t: any) => {
    const testMultipleReplica = async (instanceNumber: number) => {
      const e = await t.engineFromTgDeployPython(
        "runtimes/python/python.py",
        cwd,
      );

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
    name: "Deno: def, lambda in sync mode",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t: any) => {
    const port = t.port;
    const gate = `http://localhost:${port}`;

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
        typegraphPath: path.join(cwd, "python.ts"),
        secrets: {},
      },
    );

    const e = await t.engineFromDeployed(serialized);

    await t.should("work with def", async () => {
      await gql`
        query {
          identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
            a
            b
          }
        }
      `
        .expectData({
          identityLambda: {
            a: "hello",
            b: [1, 2, "three"],
          },
        })
        .on(e);
    });

    await t.should("work with def", async () => {
      await gql`
        query {
          identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
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
        })
        .on(e);
    });
  },
);

Meta.test(
  {
    name: "Python: infinite loop or similar in sync mode",
    sanitizeOps: false,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (t: any) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python/python.py",
      cwd,
    );

    await t.should("safely fail upon stackoverflow", async () => {
      await gql`
        query {
          stackOverflow(enable: true)
        }
      `
        .expectErrorContains("maximum recursion depth exceeded")
        .on(e);
    });
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
  async (metaTest: any) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    const load = async () => {
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
          typegraphPath: path.join(cwd, "python.ts"),
          secrets: {},
        },
      );

      return await metaTest.engineFromDeployed(serialized);
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
  async (t: any) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python/python_no_artifact.py",
      cwd,
    );

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

// Meta.test(
//   {
//     name: "Python Runtime TS SDK: typegraph with no artifacts in sync mode",
//     sanitizeOps: false,
//     syncConfig,
//     async setup() {
//       await cleanUp();
//     },
//     async teardown() {
//       await cleanUp();
//     },
//   },
//   async (t: any) => {
//     const port = t.port;
//     const gate = `http://localhost:${port}`;

//     const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
//       tgNoArtifact,
//       {
//         baseUrl: gate,
//         auth,
//         artifactsConfig: {
//           prismaMigration: {
//             globalAction: {
//               create: true,
//               reset: false,
//             },
//             migrationDir: "prisma-migrations",
//           },
//           dir: cwd,
//         },
//         typegraphPath: path.join(cwd, "python_no_artifact.ts"),
//         secrets: {},
//       },
//     );

//     const e = await t.engineFromDeployed(serialized);

//     await t.should("work when there are no artifacts in the typegraph: TS SDK, in sync mode", async () => {
//       await gql`
//         query {
//           identityDef(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//           identityLambda(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//         }
//       `
//         .expectData({
//           identityDef: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//           identityLambda: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//         })
//         .on(e);
//     });
//   },
// );

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
  async (t: any) => {
    const e = await t.engineFromTgDeployPython(
      "runtimes/python/python_duplicate_artifact.py",
      cwd,
    );

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

// Meta.test(
//   {
//     name: "Python Runtime - TS SDK: typegraph with duplicate artifact uploads in sync mode",
//     sanitizeOps: false,
//     syncConfig,
//     async setup() {
//       await cleanUp();
//     },
//     async teardown() {
//       await cleanUp();
//     },
//   },
//   async (t: any) => {
//     const port = t.port;
//     const gate = `http://localhost:${port}`;

//     const { serialized, typegate: _gateResponseAdd } = await tgDeploy(
//       tgDuplicateArtifact,
//       {
//         baseUrl: gate,
//         auth,
//         artifactsConfig: {
//           prismaMigration: {
//             globalAction: {
//               create: true,
//               reset: false,
//             },
//             migrationDir: "prisma-migrations",
//           },
//           dir: cwd,
//         },
//         typegraphPath: path.join(cwd, "python_duplicate_artifact.ts"),
//         secrets: {},
//       },
//     );

//     const e = await t.engineFromDeployed(serialized);

//     await t.should("work when there is duplicate artifacts uploads: TS SDK, in sync mode", async () => {
//       await gql`
//         query {
//           identityMod(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           },
//           identityModDuplicate(input: { a: "hello", b: [1, 2, "three"] }) {
//             a
//             b
//           }
//         }
//       `
//         .expectData({
//           identityMod: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//           identityModDuplicate: {
//             a: "hello",
//             b: [1, 2, "three"],
//           },
//         })
//         .on(e);
//     });
//   },
// );
