// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";
import { assertEquals } from "@std/assert";
import { clearSyncData, setupSync } from "test-utils/hooks.ts";
import { Typegate } from "@metatype/typegate/typegate/mod.ts";
import {
  defaultTypegateConfigBase,
  getTypegateConfig,
  SyncConfig,
} from "@metatype/typegate/config.ts";

const redisKey = "typegraph";
const redisEventKey = "typegraph_event";

async function cleanUp(config: typeof syncConfig) {
  using redis = await connect(config.redis);
  await redis.del(redisKey);
  await redis.del(redisEventKey);

  const s3 = new S3Client(config.s3);
  await tryDeleteBucket(s3, config.s3Bucket);
  await createBucket(s3, config.s3Bucket);
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
  s3Bucket: "metatype-deno-runtime-sync-test",
};

async function spawnGate(syncConfig: SyncConfig) {
  const config = getTypegateConfig({
    base: {
      ...defaultTypegateConfigBase,
    },
  });

  return await Typegate.init({
    ...config,
    sync: syncConfig,
  });
}

Meta.test(
  {
    name: "Force cleanup at boot on sync mode",
    syncConfig,
    async setup() {
      await clearSyncData(syncConfig);
      await setupSync(syncConfig);
    },
    async teardown() {
      await cleanUp(syncConfig);
    },
  },
  async (t) => {
    await t.should("cleanup if forceRemove is true", async () => {
      const _engine = await t.engine("sync/sync.py", {
        secrets: {
          ULTRA_SECRET: "if_you_can_read_me_on_an_ERROR_there_is_a_bug",
        },
      });

      const s3 = new S3Client(syncConfig.s3);
      const initialObjects = await listObjects(s3, syncConfig.s3Bucket);
      assertEquals(initialObjects?.length, 2);

      const gateNoRemove = await spawnGate(syncConfig);
      const namesNoRemove = gateNoRemove.register
        .list()
        .map(({ name }) => name);

      const gateAfterRemove = await spawnGate({
        ...syncConfig,
        forceRemove: true,
      });
      const namesAfterRemove = gateAfterRemove.register
        .list()
        .map(({ name }) => name);

      t.addCleanup(async () => {
        await gateNoRemove[Symbol.asyncDispose]();
        await gateAfterRemove[Symbol.asyncDispose]();
      });

      assertEquals(namesNoRemove, ["sync"]);
      assertEquals(namesAfterRemove, []); // !
    });
  },
);
