// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Meta } from "test-utils/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { assertEquals } from "std/assert/mod.ts";
import { Typegate } from "../../src/typegate/mod.ts";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";

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

async function lazyAssert(timeoutMs: number, fn: () => Promise<void>) {
  const start = Date.now();
  let error: Error | null = null;
  while (Date.now() - start < timeoutMs) {
    try {
      await fn();
      return;
    } catch (e) {
      error = e;
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  throw new Error(`timeout: ${error?.message}`);
}

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
}

async function waitForRedisEvent(timeoutMs: number, cb: () => Promise<void>) {
  using redis = await connect(syncConfig.redis);
  const [lastMessage] = await redis.xrevrange(redisEventKey, "+", "-", 1);
  const lastId = lastMessage ? lastMessage.xid : 0;

  await cb();

  console.log("waiting for event", lastId, timeoutMs);
  const [stream] = await redis.xread([{ key: redisEventKey, xid: lastId }], {
    block: timeoutMs,
  });
  if (!stream) {
    throw new Error("timeout: no event received");
  }
}

Meta.test("test sync through s3", async (t) => {
  await t.should("successfully send redis event", async () => {
    const s3 = new S3Client(syncConfig.s3);
    assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 0);

    await waitForRedisEvent(5000, async () => {
      const _e = await t.engine("simple/simple.py");
    });

    assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 1);
    s3.destroy();
  });

  await t.should(
    "sync typegraphs on new instances",
    async () => {
      const typegate2 = await Typegate.init(syncConfig);
      assertEquals(typegate2.register.list().length, 1);

      await typegate2.deinit();
    },
  );

  await cleanUp();

  await t.should("register new typegraph on all the instances", async () => {
    const typegate2 = await Typegate.init(syncConfig);

    await waitForRedisEvent(5000, async () => {
      const _e = await t.engine("simple/simple.py");
    });

    assertEquals(t.typegate.register.list().length, 1);

    await lazyAssert(5000, async () => {
      await Promise.resolve();
      assertEquals(typegate2.register.list().length, 1);
    });

    await typegate2.deinit();
  });
}, {
  syncConfig,
  async setup() {
    await cleanUp();
  },
  async teardown() {
    await cleanUp();
  },
});
