// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { assertEquals, assertRejects } from "std/assert/mod.ts";
import { syncConfigFromEnv } from "../../src/sync/config.ts";

function clearSyncVars() {
  for (const key of Object.keys(Deno.env.toObject())) {
    if (key.startsWith("SYNC_")) {
      Deno.env.delete(key);
    }
  }
}

Deno.test("test sync config", async (t) => {
  await t.step(
    "succeed to parse valid env vars for disabled sync",
    async () => {
      clearSyncVars();
      const syncConfig = await syncConfigFromEnv(["vars"]);
      assertEquals(syncConfig, null);
    },
  );

  await t.step("succeed to parse valid env vars for sync", async () => {
    clearSyncVars();
    Deno.env.set("SYNC_ENABLED", "true");
    Deno.env.set("SYNC_REDIS_URL", "redis://localhost:6379/0");
    Deno.env.set("SYNC_REDIS_PASSWORD", "password");

    Deno.env.set("SYNC_S3_HOST", "https://s3.amazonaws.com");
    Deno.env.set("SYNC_S3_REGION", "us-west-1");
    Deno.env.set("SYNC_S3_ACCESS_KEY", "access_key");
    Deno.env.set("SYNC_S3_SECRET_KEY", "secret_key");
    Deno.env.set("SYNC_S3_BUCKET", "bucket");

    const syncConfig = await syncConfigFromEnv(["vars"]);
    assertEquals(syncConfig, {
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

  await t.step("fails for missing env vars", async () => {
    clearSyncVars();
    Deno.env.set("SYNC_REDIS_URL", "redis://localhost:6379");
    await assertRejects(
      () => syncConfigFromEnv(["vars"]),
      Error,
      "Environment variables required for sync: ",
    );

    clearSyncVars();
    Deno.env.set("SYNC_ENABLED", "true");
    Deno.env.set("SYNC_REDIS_URL", "redis://localhost:6379/0");
    Deno.env.set("SYNC_REDIS_PASSWORD", "password");

    Deno.env.set("SYNC_S3_HOST", "https://s3.amazonaws.com");
    Deno.env.set("SYNC_S3_REGION", "us-west-1");
    Deno.env.set("SYNC_S3_ACCESS_KEY", "access_key");
    Deno.env.set("SYNC_S3_BUCKET", "bucket");

    await assertRejects(
      () => syncConfigFromEnv(["vars"]),
      Error,
      "Environment variables required for sync: SYNC_S3_SECRET_KEY.",
    );
  });
});
