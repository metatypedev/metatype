// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { mapKeys } from "std/collections/map_keys.ts";

import * as base64 from "std/encoding/base64.ts";
import { parse } from "std/flags/mod.ts";
import { RedisConnectOptions } from "redis";
import { join } from "std/path/mod.ts";
// This import ensure log loads before config, important for the version hydration
import { configOrExit, zBooleanString } from "./log.ts";

const schema = {
  debug: zBooleanString,
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: zBooleanString,
  hostname: z.string(),
  redis_url: z
    .string()
    .url()
    .transform((s: string) => {
      const url = new URL(s);
      if (url.password === "") {
        url.password = Deno.env.get("REDIS_PASSWORD") ?? "";
      }
      return url;
    }),
  tg_port: z.coerce.number().positive().max(65535),
  tg_secret: z.string().transform((s: string, ctx) => {
    const bytes = base64.decode(s);
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
  timer_destroy_ressources: z.boolean(),
  timer_policy_eval_retries: z.number().nonnegative().max(5),
  allow_redisless_mode_on_fail: z.boolean(),
  tg_admin_password: z.string(),
  tmp_dir: z.string(),
  jwt_max_duration_sec: z.coerce.number().positive(),
  jwt_refresh_duration_sec: z.coerce.number().positive(),
  version: z.string(),
  trust_proxy: zBooleanString,
  trust_header_ip: z.string(),
  request_log: z.string().optional(),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.coerce.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.coerce.number().positive().min(0).max(1),
};

async function getHostname() {
  try {
    const { stdout } = await new Deno.Command(
      "hostname",
      { stdout: "piped" },
    ).output();
    return new TextDecoder().decode(stdout).trim();
  } catch (_e) {
    console.debug(
      `Not hostname binary found, falling back to env var HOSTNAME`,
    );
    return Deno.env.get("HOSTNAME") ?? "UNKNOWN_HOSTNAME";
  }
}

const config = await configOrExit([
  {
    debug: "false",
    packaged: "true",
    hostname: await getHostname(),
    tmp_dir: join(Deno.cwd(), "tmp"),
    jwt_max_duration_sec: 3600 * 24 * 30,
    jwt_refresh_duration_sec: 60 * 5,
    sentry_sample_rate: 1,
    sentry_traces_sample_rate: 1,
    trust_proxy: false,
    trust_header_ip: "X-Forwarded-For",
    tg_port: "7890",
    timer_max_timeout_ms: 3000,
    timer_destroy_ressources: true,
    timer_policy_eval_retries: 1,
    allow_redisless_mode_on_fail: false,
  },
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
  parse(Deno.args) as Record<string, unknown>,
], schema);

export default config;

export const redisConfig: RedisConnectOptions = {
  hostname: config.redis_url.hostname,
  port: config.redis_url.port,
  ...config.redis_url.password.length > 0
    ? { password: config.redis_url.password }
    : {},
  db: parseInt(config.redis_url.pathname.substring(1), 10),
};
