// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { SyncConfig } from "@metatype/typegate/config.ts";
import { createBucket, tryDeleteBucket } from "test-utils/s3.ts";
import { connect } from "redis";
import { S3Client, type S3ClientConfig } from "aws-sdk/client-s3";

// TODO single source of truth
const redisKey = "typegraph";
const redisEventKey = "typegraph_event";

export async function clearSyncData(syncConfig: SyncConfig) {
  using redis = await connect(syncConfig.redis);
  await redis.del(redisKey);
  await redis.del(redisEventKey);

  const s3Config: S3ClientConfig = { ...syncConfig.s3 };
  if (!s3Config.forcePathStyle) {
    const endpoint = new URL(s3Config.endpoint as string);
    endpoint.pathname = `/${syncConfig.s3Bucket}`;
    s3Config.endpoint = endpoint.href;
  }
  const s3 = new S3Client(s3Config);
  await tryDeleteBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
  await redis.quit();
}

export async function setupSync(syncConfig: SyncConfig) {
  const s3Config = { ...syncConfig.s3 };
  if (!s3Config.forcePathStyle) {
    const endpoint = new URL(s3Config.endpoint as string);
    endpoint.pathname = `/${syncConfig.s3Bucket}`;
    s3Config.endpoint = endpoint.href;
  }
  const s3 = new S3Client(s3Config);
  await createBucket(s3, syncConfig.s3Bucket);
  s3.destroy();
}
