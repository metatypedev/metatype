// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { z } from "zod";
import { mapKeys } from "std/collections/map_keys.ts";

import { decodeBase64 } from "std/encoding/base64.ts";
import { parse } from "std/flags/mod.ts";
import { join } from "std/path/mod.ts";
// This import ensure log loads before config, important for the version hydration
import { configOrExit, zBooleanString } from "./log.ts";

const schema = {
  debug: zBooleanString,
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: zBooleanString,
  hostname: z.string(),
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
  version: z.string(),
  trust_proxy: zBooleanString,
  trust_header_ip: z.string(),
  request_log: z.string().optional(),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.coerce.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.coerce.number().positive().min(0).max(1),
  redis_url_queue_expire_sec: z.coerce.number().positive(),
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
    timer_destroy_resources: true,
    timer_policy_eval_retries: 1,
    redis_url_queue_expire_sec: 60 * 5, // 5 minutes
  },
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
  parse(Deno.args) as Record<string, unknown>,
], schema);

export default config;
