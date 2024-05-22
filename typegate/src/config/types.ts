// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { decodeBase64 } from "std/encoding/base64.ts";
import { RedisConnectOptions } from "redis";
import { S3ClientConfig } from "aws-sdk/client-s3";

const zBooleanString = z.preprocess(
  (a: unknown) => z.coerce.string().parse(a) === "true",
  z.boolean(),
);

export const globalConfigSchema = z.object({
  debug: zBooleanString,
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: zBooleanString,
  hostname: z.string(),
  version: z.string(),
  trust_proxy: zBooleanString,
  trust_header_ip: z.string(),
  request_log: z.string().optional(),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.coerce.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.coerce.number().positive().min(0).max(1),
});
export type GlobalConfig = z.infer<typeof globalConfigSchema>;

// These config entries are only accessible on a Typegate instance.
// They are not read from a global variable to enable test isolation and configurability.
export const typegateConfigBaseSchema = z.object({
  tg_port: z.coerce.number().positive().max(65535),
  tg_secret: z.string().transform((s: string, ctx) => {
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
  tg_admin_password: z.string(),
  tmp_dir: z.string(),
  jwt_max_duration_sec: z.coerce.number().positive(),
  jwt_refresh_duration_sec: z.coerce.number().positive(),
  /**
   * Time in seconds in which a URL expires after being pushed to Redis
   */
  redis_url_queue_expire_sec: z.coerce.number().positive(),
});
export type TypegateConfigBase = z.infer<typeof typegateConfigBaseSchema>;

// These config entries are only accessible on a Typegate instance.
// They are not read from a global variable to enable test isolation and configurability.
export const syncConfigSchema = z.object({
  redis_url: z.string().transform((s) => new URL(s)),
  s3_host: z.string().transform((s) => new URL(s)),
  s3_region: z.string(),
  s3_bucket: z.string(),
  s3_access_key: z.string(),
  s3_secret_key: z.string(),
  s3_path_style: zBooleanString.default(true),
});
export type SyncConfig = z.infer<typeof syncConfigSchema>;
export type SyncConfigX = {
  redis: RedisConnectOptions;
  s3: S3ClientConfig;
  s3Bucket: string;
};

export type TypegateConfig = {
  base: TypegateConfigBase;
  sync: SyncConfigX | null;
};

// Those envs are split from the config as only a subset of them are shared with the workers
export const sharedConfigSchema = z.object({
  debug: zBooleanString,
  log_level: z
    .enum(["NOTSET", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
    .optional(),
  rust_log: z.string().optional(),
  version: z.string(),
  deno_testing: zBooleanString,
});
