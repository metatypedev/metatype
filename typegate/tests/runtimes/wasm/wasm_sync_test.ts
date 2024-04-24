// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy, tgRemove } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasm.ts";
import * as path from "std/path/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";
import { assertEquals, assertExists } from "std/assert/mod.ts";

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
  s3Bucket: "metatype-sync-test",
};

const cwd = path.join(testDir, "runtimes/wasm");
const auth = new BasicAuth("admin", "password");

Meta.test(
  {
    name: "Wasm Runtime typescript SDK: Sync Config",
    port: true,
    systemTypegraphs: true,
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (metaTest) => {
    const port = metaTest.port;
    const gate = `http://localhost:${port}`;

    const { serialized, typegate: gateResponseAdd } = await tgDeploy(tg, {
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
      typegraphPath: path.join(cwd, "wasm.ts"),
      secrets: {},
    });

    await metaTest.should("work after deploying artifact to S3", async () => {
      const s3 = new S3Client(syncConfig.s3);
      assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 2);

      assertExists(serialized, "serialized has a value");
      assertEquals(gateResponseAdd, {
        data: {
          addTypegraph: { name: "wasm-ts", messages: [], migrations: [] },
        },
      });

      const s3Objects = await listObjects(s3, syncConfig.s3Bucket);
      // two objects, the artifact and the typegraph
      assertEquals(s3Objects?.length, 2);

      const engine = await metaTest.engineFromDeployed(serialized);

      await gql`
        query {
          add(a: 11, b: 2)
          range(a: 1, b: 4)
        }
      `
        .expectData({
          add: 13,
          range: [1, 2, 3, 4],
        })
        .on(engine);

      s3.destroy();
    });

    await metaTest.should("work with multiple typegate instances", async () => {
      const s3 = new S3Client(syncConfig.s3);

      // typegraphs are pushed to s3 whenever pushed to a typegate
      assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 3);

      const engine = await metaTest.engineFromDeployed(serialized);

      await gql`
        query {
          add(a: 11, b: 2)
          range(a: 1, b: 4)
        }
      `
        .expectData({
          add: 13,
          range: [1, 2, 3, 4],
        })
        .on(engine);

      // second engine on the other typegate instance
      const engine2 = await metaTest.engineFromDeployed(serialized);

      await gql`
        query {
          add(a: 11, b: 2)
          range(a: 1, b: 4)
        }
      `
        .expectData({
          add: 13,
          range: [1, 2, 3, 4],
        })
        .on(engine2);

      const { typegate: gateResponseRem } = await tgRemove(tg, {
        baseUrl: gate,
        auth,
      });

      assertEquals(gateResponseRem, { data: { removeTypegraphs: true } });

      s3.destroy();
    });
  },
);
