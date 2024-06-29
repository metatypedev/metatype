// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SyncConfig } from "@typegate/config.ts";
import { createBucket, tryDeleteBucket } from "test-utils/s3.ts";
import { connect } from "redis";
import { S3Client } from "aws-sdk/client-s3";

// TODO single source of truth
const redisKey = "typegraph";
const redisEventKey = "typegraph_event";

export async function clearSyncData(syncConfig: SyncConfig) {
  using redis = await connect(syncConfig.redis);
  await redis.del(redisKey);
  await redis.del(redisEventKey);

  const s3 = new S3Client(syncConfig.s3);
  await tryDeleteBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
  await redis.quit();
}

export async function setupSync(syncConfig: SyncConfig) {
  const s3 = new S3Client(syncConfig.s3);
  await createBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
}
