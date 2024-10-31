// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { z } from "zod";

import { parseArgs } from "@std/cli/parse-args";
import { mapKeys } from "@std/collections/map-keys";
import { filterKeys } from "@std/collections/filter-keys";
import { configOrExit, configOrThrow } from "./config/loader.ts";
import {
  globalConfigSchema,
  type SyncConfig,
  syncConfigSchema,
  type SyncConfigX,
  type TypegateConfigBase,
  typegateConfigBaseSchema,
} from "./config/types.ts";
import type { TypegateConfig } from "./config/types.ts";
export type { SyncConfigX as SyncConfig, TypegateConfig, TypegateConfigBase };

async function getHostname() {
  try {
    const { stdout } = await new Deno.Command("hostname", {
      stdout: "piped",
    }).output();
    return new TextDecoder().decode(stdout).trim();
  } catch (_e) {
    console.debug(
      `Not hostname binary found, falling back to env var HOSTNAME`
    );
    return Deno.env.get("HOSTNAME") ?? "UNKNOWN_HOSTNAME";
  }
}

// set version for config and workers, only running in main engine
const { get_version } = await import("native");
Deno.env.set("VERSION", get_version());

export const globalConfig = configOrExit(
  globalConfigSchema,
  {
    debug: "false",
    packaged: "true",
    hostname: await getHostname(),
    tg_port: 7890,
    trust_proxy: false,
    trust_header_ip: "X-Forwarded-For",
    sentry_sample_rate: 1,
    sentry_traces_sample_rate: 1,
  },
  [
    mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
    parseArgs(Deno.args) as Record<string, unknown>,
  ]
);

export const defaultTypegateConfigBase = {
  timer_max_timeout_ms: 3_000,
  timer_destroy_resources: true,
  timer_policy_eval_retries: 1,
  jwt_max_duration_sec: 3600 * 24 * 30,
  jwt_refresh_duration_sec: 60 * 5,
  redis_url_queue_expire_sec: 60 * 5, // 5 minutes
  substantial_poll_interval_sec: 1,
  substantial_lease_lifespan_sec: 2,
  substantial_max_acquire_per_tick: 3,
};

const SYNC_PREFIX = "sync_";
function filterMapSyncKeys(obj: Record<string, unknown>) {
  return mapKeys(
    filterKeys(obj, (k) => k.startsWith(SYNC_PREFIX)),
    (k) => k.slice(SYNC_PREFIX.length)
  );
}

function envsAsConfig() {
  return mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase());
}

function argsAsConfig() {
  return mapKeys(parseArgs(Deno.args) as Record<string, unknown>, (k) =>
    k.toLocaleLowerCase().replace("-", "_")
  );
}

export function transformSyncConfig(raw: SyncConfig): SyncConfigX {
  const { hostname, port, password, pathname } = raw.redis_url;
  const redisDb = parseInt(pathname.slice(1));
  if (isNaN(redisDb)) {
    console.error(`Invalid redis db: ${pathname}`);
    throw new Error(`Invalid redis db: ${pathname}`);
  }
  const redis = {
    hostname,
    port,
    ...(password.length > 0 ? { password } : {}),
    db: redisDb,
  };

  const s3 = {
    endpoint: raw.s3_host.href,
    region: raw.s3_region,
    credentials: {
      accessKeyId: raw.s3_access_key,
      secretAccessKey: raw.s3_secret_key,
    },
    forcePathStyle: raw.s3_path_style,
  };

  return {
    redis,
    s3,
    s3Bucket: raw.s3_bucket,
  };
}

export function getTypegateConfig(defaults: {
  base?: Partial<z.input<typeof typegateConfigBaseSchema>>;
  sync?: Partial<z.input<typeof syncConfigSchema>>;
}): TypegateConfig {
  const base = configOrThrow(typegateConfigBaseSchema, defaults.base ?? {}, [
    envsAsConfig(),
    argsAsConfig(),
  ]);
  const syncSources = [envsAsConfig(), argsAsConfig()].map(filterMapSyncKeys);
  const syncDisabled =
    (defaults.sync == null || Object.keys(defaults.sync).length === 0) &&
    syncSources.every((s) => Object.keys(s).length === 0);

  const sync = syncDisabled
    ? null
    : configOrThrow(syncConfigSchema, defaults.sync ?? {}, syncSources);
  return { base, sync: sync && transformSyncConfig(sync) };
}
