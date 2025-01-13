// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { transformSyncConfig } from "@metatype/typegate/config.ts";
import { clearSyncData, setupSync } from "test-utils/hooks.ts";

const defaultSyncEnvs = {
  // SYNC_REDIS_URL: "redis://:password@localhost:6379/12",
  SYNC_S3_HOST: "http://localhost:9000",
  SYNC_S3_REGION: "local",
  SYNC_S3_ACCESS_KEY: "minio",
  SYNC_S3_SECRET_KEY: "password",
  // SYNC_S3_BUCKET: "upgrade-test",
  SYNC_S3_PATH_STYLE: "true",
  SYNC_FORCE_REMOVE: "false",
};

export function config(p: { redisDb: number; s3Bucket: string }) {
  const syncEnvs = {
    SYNC_REDIS_URL: `redis://:password@localhost:6379/${p.redisDb}`,
    SYNC_S3_BUCKET: p.s3Bucket,
    ...defaultSyncEnvs,
  };
  const syncConfig = transformSyncConfig({
    redis_url: new URL(syncEnvs.SYNC_REDIS_URL),
    s3_host: new URL(syncEnvs.SYNC_S3_HOST),
    s3_region: syncEnvs.SYNC_S3_REGION,
    s3_access_key: syncEnvs.SYNC_S3_ACCESS_KEY,
    s3_secret_key: syncEnvs.SYNC_S3_SECRET_KEY,
    s3_bucket: syncEnvs.SYNC_S3_BUCKET,
    s3_path_style: true,
    force_remove: false,
  });

  return { syncConfig, syncEnvs };
}

export class Config {
  syncEnvs: Record<string, string>;
  syncConfig: ReturnType<typeof transformSyncConfig>;

  constructor(redisDb: number, s3Bucket: string) {
    this.syncEnvs = {
      SYNC_REDIS_URL: `redis://:password@localhost:6379/${redisDb}`,
      SYNC_S3_BUCKET: s3Bucket,
      ...defaultSyncEnvs,
    };
    this.syncConfig = transformSyncConfig({
      redis_url: new URL(this.syncEnvs.SYNC_REDIS_URL),
      s3_host: new URL(this.syncEnvs.SYNC_S3_HOST),
      s3_region: this.syncEnvs.SYNC_S3_REGION,
      s3_access_key: this.syncEnvs.SYNC_S3_ACCESS_KEY,
      s3_secret_key: this.syncEnvs.SYNC_S3_SECRET_KEY,
      s3_bucket: this.syncEnvs.SYNC_S3_BUCKET,
      s3_path_style: true,
      force_remove: false,
    });
  }

  async clearSyncData() {
    await clearSyncData(this.syncConfig);
  }

  async setupSync() {
    await setupSync(this.syncConfig);
  }
}
