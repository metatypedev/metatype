// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { gql, Meta } from "test-utils/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, listObjects, tryDeleteBucket } from "test-utils/s3.ts";
import { assertEquals } from "@std/assert";

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
    db: 4,
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
  s3Bucket: "metatype-wasm-wire-sync-test",
};

Meta.test(
  {
    name: "Wasm Runtime typescript SDK: Sync Config",
    syncConfig,
    async setup() {
      await cleanUp();
    },
    async teardown() {
      await cleanUp();
    },
  },
  async (metaTest) => {
    await metaTest.shell(["bash", "build.sh"], {
      currentDir: `${import.meta.dirname!}/rust`,
    });

    await metaTest.should("work after deploying artifact to S3", async () => {
      const s3 = new S3Client(syncConfig.s3);
      assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 0);

      const engine = await metaTest.engine("runtimes/wasm_wire/wasm_wire.ts");

      const s3Objects = await listObjects(s3, syncConfig.s3Bucket);
      // two objects, the artifact and the typegraph
      assertEquals(s3Objects?.length, 2);

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

      assertEquals((await listObjects(s3, syncConfig.s3Bucket))?.length, 2);

      const engine = await metaTest.engine("runtimes/wasm_wire/wasm_wire.ts");

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
      const engine2 = await metaTest.engine("runtimes/wasm_wire/wasm_wire.ts");

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

      s3.destroy();
    });
  },
);
