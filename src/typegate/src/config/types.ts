// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type RefinementCtx, z } from "zod";
import { decodeBase64 } from "@std/encoding/base64";
import type { RedisConnectOptions } from "redis";
import type { S3ClientConfig } from "aws-sdk/client-s3";
import type { LevelName } from "@std/log";

const zBooleanString = z.preprocess(
  (a: unknown) => z.coerce.string().parse(a) === "true",
  z.boolean(),
);

const addMissingEnvVarIssue = (envVar: string, ctx: RefinementCtx) => {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `Error: Env var ${envVar} is not configured.`,
  });

  return z.NEVER;
};

const refineEnvVar = (envVar: string) =>
  z
    .string()
    .optional()
    .transform((s: string | undefined, ctx) => {
      if (s === undefined) {
        return addMissingEnvVarIssue(envVar, ctx);
      }

      return s;
    });

const refineURLEnvVar = (envVar: string) =>
  z
    .string()
    .optional()
    .transform((s: string | undefined, ctx) => {
      if (s === undefined) {
        return addMissingEnvVarIssue(envVar, ctx);
      }

      return new URL(s);
    });

export const globalConfigSchema = z.object({
  debug: zBooleanString,
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: zBooleanString,
  version: z.string(),
  hostname: z.string(),
  tg_port: z.coerce.number().nonnegative().max(65535),
  trust_proxy: zBooleanString,
  trust_header_ip: z.string(),
  request_log: z.string().optional(),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.coerce.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.coerce.number().positive().min(0).max(1),
  deno_v8_flags: z.string().optional(),
  min_deno_workers: z.coerce.number().positive().default(2),
  max_deno_workers: z.coerce.number().positive().default(8),
  deno_worker_wait_timeout_ms: z.coerce.number().positive().default(5000),
  // deno_idle_worker_timeout_ms: z.coerce.number().positive().optional(), // auto remove idle workers
  min_substantial_workers: z.coerce.number().positive().default(2),
  max_substantial_workers: z.coerce.number().positive().default(8),
  min_wasm_workers: z.coerce.number().positive().default(2),
  max_wasm_workers: z.coerce.number().positive().default(8),
  wasm_worker_wait_timeout_ms: z.coerce.number().positive().default(5000),
  substantial_worker_wait_timeout_ms: z.coerce
    .number()
    .positive()
    .default(15000),
  // substantial_idle_worker_timeout_ms: z.coerce.number().positive().optional(), // auto remove idle workers
});
export type GlobalConfig = z.infer<typeof globalConfigSchema>;

// These config entries are only accessible on a Typegate instance.
// They are not read from a global variable to enable test isolation and configurability.
export const typegateConfigBaseSchema = z.object({
  tg_secret: z
    .string()
    .optional()
    .transform((s: string | undefined, ctx) => {
      if (s === undefined) {
        return addMissingEnvVarIssue("TG_SECRET", ctx);
      }

      const bytes = decodeBase64(s);
      if (bytes.length != 64) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            `Base64 contains ${bytes.length} instead of 64 bytes (use openssl rand -base64 64 | tr -d '\n')`,
        });
      }
      return bytes;
    }),
  timer_max_timeout_ms: z.coerce.number().positive().max(60000),
  timer_destroy_resources: z.boolean(),
  timer_policy_eval_retries: z.number().nonnegative().max(5),
  tg_admin_password: refineEnvVar("TG_ADMIN_PASSWORD"),
  tmp_dir: z.string(),
  jwt_max_duration_sec: z.coerce.number().positive(),
  jwt_refresh_duration_sec: z.coerce.number().positive(),
  /**
   * Time in seconds in which a URL expires after being pushed to Redis
   */
  redis_url_queue_expire_sec: z.coerce.number().positive(),
  /** Rate at which new schedules are read */
  substantial_poll_interval_sec: z.coerce.number().positive().min(0.5).max(60),
  /** Lease duration associated to a run_id */
  substantial_lease_lifespan_sec: z.coerce.number().positive().min(1),
  /** Maximum amount of new acquired replay requests per tick */
  substantial_max_acquire_per_tick: z.coerce.number().positive().min(1),
});

export type TypegateConfigBase = z.infer<typeof typegateConfigBaseSchema>;

// These config entries are only accessible on a Typegate instance.
// They are not read from a global variable to enable test isolation and configurability.
export const syncConfigSchema = z.object({
  redis_url: refineURLEnvVar("SYNC_REDIS_URL"),
  s3_host: refineURLEnvVar("SYNC_S3_HOST"),
  s3_region: refineEnvVar("SYNC_S3_REGION"),
  s3_bucket: refineEnvVar("SYNC_S3_BUCKET"),
  s3_access_key: refineEnvVar("SYNC_S3_ACCESS_KEY"),
  s3_secret_key: refineEnvVar("SYNC_S3_SECRET_KEY"),
  s3_path_style: zBooleanString.default(false),
  force_remove: zBooleanString.default(false),
});
export type SyncConfig = z.infer<typeof syncConfigSchema>;
export type SyncConfigX = {
  redis: RedisConnectOptions;
  s3: S3ClientConfig;
  s3Bucket: string;
  forceRemove?: boolean;
};

export type TypegateConfig = {
  base: TypegateConfigBase;
  sync: SyncConfigX | null;
};

export const logLevelItemSchema = z.enum(
  ["NOTSET", "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"] as readonly [
    LevelName,
    ...LevelName[],
  ],
  {
    description: "log_level item",
  },
);

export const logLevelSchema = z.string().transform((value) => {
  let defaultLevel: LevelName = "ERROR";
  const loggerConfs: Record<string, LevelName> = {};
  const confs = value.toUpperCase().split(",");

  for (const confSection of confs) {
    const [left, ...right] = confSection.split("=");
    if (right.length == 0) {
      defaultLevel = logLevelItemSchema.parse(left.trim());
    } else {
      loggerConfs[left.toLowerCase()] = logLevelItemSchema.parse(
        right.join("=").trim(),
      );
    }
  }

  loggerConfs["default"] = defaultLevel;
  return loggerConfs;
});

// Those envs are split from the config as only a subset of them are shared with the workers
export const sharedConfigSchema = z.object({
  debug: zBooleanString,
  log_level: logLevelSchema.optional(),
  rust_log: z.string().optional(),
  version: z.string(),
  deno_testing: zBooleanString,
});
