// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assert, assertEquals } from "@std/assert";
import {
  defaultTypegateConfigBase,
  getTypegateConfig,
  SyncConfig,
} from "@metatype/typegate/config.ts";
import { ConfigError } from "@metatype/typegate/config/loader.ts";

function clearSyncVars() {
  for (const key of Object.keys(Deno.env.toObject())) {
    if (key.startsWith("SYNC_")) {
      Deno.env.delete(key);
    }
  }
}

function getSyncConfig(): SyncConfig | null {
  return getTypegateConfig({
    base: defaultTypegateConfigBase,
    sync: {},
  }).sync;
}

Deno.test("test sync config", async (t) => {
  await t.step("succeed to parse valid env vars for disabled sync", () => {
    clearSyncVars();
    assertEquals(getSyncConfig(), null);
  });

  await t.step("succeed to parse valid env vars for sync", () => {
    clearSyncVars();
    Deno.env.set("SYNC_ENABLED", "true");
    Deno.env.set("SYNC_REDIS_URL", "redis://:password@localhost:6379/0");

    Deno.env.set("SYNC_S3_HOST", "https://s3.amazonaws.com");
    Deno.env.set("SYNC_S3_REGION", "us-west-1");
    Deno.env.set("SYNC_S3_ACCESS_KEY", "access_key");
    Deno.env.set("SYNC_S3_SECRET_KEY", "secret_key");
    Deno.env.set("SYNC_S3_BUCKET", "bucket");

    assertEquals(getSyncConfig(), {
      redis: {
        hostname: "localhost",
        port: "6379",
        password: "password",
        db: 0,
      },
      s3: {
        endpoint: "https://s3.amazonaws.com/",
        region: "us-west-1",
        credentials: {
          accessKeyId: "access_key",
          secretAccessKey: "secret_key",
        },
        forcePathStyle: false,
      },
      s3Bucket: "bucket",
    });
  });

  await t.step("fails for missing env vars", () => {
    clearSyncVars();
    Deno.env.set("SYNC_REDIS_URL", "redis://localhost:6379");
    assertInvalidSyncConfig(
      [
        "s3_host",
        "s3_region",
        "s3_bucket",
        "s3_access_key",
        "s3_secret_key",
      ].map((k) => ({
        code: "custom",
        message: `Error: Env var SYNC_${k.toUpperCase()} is not configured.`,
        path: [k],
      })),
    );

    clearSyncVars();
    Deno.env.set("SYNC_ENABLED", "true");
    Deno.env.set("SYNC_REDIS_URL", "redis://:password@localhost:6379/0");

    Deno.env.set("SYNC_S3_HOST", "https://s3.amazonaws.com");
    Deno.env.set("SYNC_S3_REGION", "us-west-1");
    Deno.env.set("SYNC_S3_ACCESS_KEY", "access_key");
    Deno.env.set("SYNC_S3_BUCKET", "bucket");
    assertInvalidSyncConfig([
      {
        code: "custom",
        message: "Error: Env var SYNC_S3_SECRET_KEY is not configured.",
        path: ["s3_secret_key"],
      },
    ]);
  });
});

function assertInvalidSyncConfig(issues: any[]) {
  try {
    getSyncConfig();
    throw new Error("should have thrown");
  } catch (e) {
    assert(e instanceof ConfigError);
    assertEquals(e.issues, issues);
  }
}
