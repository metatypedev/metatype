// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { BasicAuth, tgDeploy } from "@typegraph/sdk/tg_deploy.js";
import { gql, Meta } from "test-utils/mod.ts";
import { testDir } from "test-utils/dir.ts";
import { tg } from "./wasmedge.ts";
import * as path from "std/path/mod.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";
import { createBucket, tryDeleteBucket } from "test-utils/s3.ts";

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

const cwd = path.join(testDir, "runtimes/wasmedge");
const auth = new BasicAuth("admin", "password");

Meta.test("WasmEdge Runtime typescript SDK: Sync Config", async (metaTest) => {
  const port = metaTest.port;
  const gate = `http://localhost:${port}`;

  await metaTest.should("work after deploying artifact", async () => {
    const { serialized, typegate: _gateResponseAdd } = await tgDeploy(tg, {
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
      typegraphPath: path.join(cwd, "wasmedge.ts"),
      secrets: {},
    });

    const engine = await metaTest.engineFromDeployed(serialized);

    await gql`
      query {
        test_wasi_ts(a: 11, b: 2)
      }
    `
      .expectData({
        test_wasi_ts: 13,
      })
      .on(engine);
    await engine.terminate();
  });
}, {
  syncConfig,
  async setup() {
    await cleanUp();
  },
  async teardown() {
    await cleanUp();
  },
  port: true,
});
