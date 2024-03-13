// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { configOrExit, zBooleanString } from "../log.ts";
import { RedisConnectOptions } from "redis";
import { S3ClientConfig } from "aws-sdk/client-s3";
import { mapKeys } from "std/collections/map_keys.ts";
import { parse } from "std/flags/mod.ts";

export const syncConfigSchemaNaked = {
  sync_enabled: zBooleanString,
  sync_redis_url: z.string().optional().transform((s) => {
    if (s == undefined) return undefined;
    const url = new URL(s);
    if (url.password === "") {
      url.password = Deno.env.get("SYNC_REDIS_PASSWORD") ?? "";
    }
    return url;
  }),
  sync_s3_host: z.string().optional().transform((s) => {
    if (s == undefined) return undefined;
    return new URL(s);
  }),
  sync_s3_region: z.string().optional(),
  sync_s3_bucket: z.string().optional(),
  sync_s3_access_key: z.string().optional(),
  sync_s3_secret_key: z.string().optional(),
  sync_s3_path_style: zBooleanString.optional(),
};

export const syncConfigSchema = z.object(syncConfigSchemaNaked);

export type SyncConfigRaw = Required<z.output<typeof syncConfigSchema>>;

export function validateSyncConfig(
  config: z.output<typeof syncConfigSchema>,
): SyncConfigRaw | null {
  if (!config.sync_enabled) {
    const unexpectedVars = Object.entries(config).filter(([key, value]) => {
      if (key === "sync_enabled") return false;
      if (value != undefined) {
        return true;
      }
    }).map(([key, _]) => key.toUpperCase());

    if (unexpectedVars.length > 0) {
      const unexpectedVarsStr = unexpectedVars.join(", ");
      const msg =
        `Unexpected environment variables when sync is disabled: ${unexpectedVarsStr}.`;
      const suggestion =
        "Make sure to remove these variables or set SYNC_ENABLED=true.";
      throw new Error(`${msg}\n${suggestion}`);
    }

    return null;
  }

  const missingVars = Object.keys(syncConfigSchemaNaked).filter(
    (key) => {
      const value = config[key as keyof typeof config];
      if (value != undefined) return false;

      // not required
      if (key === "sync_s3_path_style") {
        config.sync_s3_path_style = false;
        return false;
      }
      return true;
    },
  ).map((key) => key.toUpperCase());

  if (missingVars.length > 0) {
    const missingVarsStr = missingVars.join(", ");
    const msg = `Environment variables required for sync: ${missingVarsStr}.`;
    const suggestion =
      "Make sure to set these variables or set SYNC_ENABLED=false.";
    throw new Error(`${msg}\n${suggestion}`);
  }

  const finalConfig = config as SyncConfigRaw;
  return finalConfig;
}

export type SyncConfig = {
  redis: RedisConnectOptions;
  s3: S3ClientConfig;
  s3Bucket: string;
};

export function syncConfigFromRaw(
  config: SyncConfigRaw | null,
): SyncConfig | null {
  console.log("raw config", config);
  if (config == null) return null;

  const redisDbStr = config.sync_redis_url.pathname.substring(1);
  const redisDb = parseInt(redisDbStr, 10);
  if (isNaN(redisDb)) {
    throw new Error(`Invalid redis db number: '${redisDbStr}'`);
  }

  return {
    redis: {
      hostname: config.sync_redis_url.hostname,
      port: config.sync_redis_url.port,
      ...config.sync_redis_url.password.length > 0
        ? { password: config.sync_redis_url.password }
        : {},
      db: parseInt(config.sync_redis_url.pathname.substring(1), 10),
    },
    s3: {
      endpoint: config.sync_s3_host.href,
      region: config.sync_s3_region,
      credentials: {
        accessKeyId: config.sync_s3_access_key,
        secretAccessKey: config.sync_s3_secret_key,
      },
      forcePathStyle: config.sync_s3_path_style,
    },
    s3Bucket: config.sync_s3_bucket,
  };
}

export type ConfigSource = "vars" | "args";

export async function syncConfigFromEnv(
  sources: ConfigSource[],
): Promise<SyncConfig | null> {
  const rawObjects = sources.map((source) => {
    switch (source) {
      case "vars":
        return mapKeys(
          Deno.env.toObject(),
          (k: string) => k.toLowerCase(),
        );
      case "args":
        return parse(Deno.args) as Record<string, unknown>;
    }
  });
  const syncConfigRaw = await configOrExit(rawObjects, syncConfigSchemaNaked);

  return syncConfigFromRaw(validateSyncConfig(syncConfigRaw));
}
