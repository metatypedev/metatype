// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { z } from "zod";
import { getLogger } from "./log.ts";
import { load } from "std/dotenv/mod.ts";
import { deepMerge } from "std/collections/deep_merge.ts";
import { mapKeys } from "std/collections/map_keys.ts";
import * as base64 from "std/encoding/base64.ts";
import { parse } from "std/flags/mod.ts";
import { get_version } from "native";
import { RedisConnectOptions } from "redis";

async function getHostname() {
  try {
    const cmd = Deno.run({ cmd: ["hostname"], stdout: "piped" });
    const stdout = await cmd.output();
    cmd.close();
    return new TextDecoder().decode(stdout).trim();
  } catch (e) {
    console.debug(`cannot use hostname binary (${e.message}), fallback to env`);
    return Deno.env.get("HOSTNAME") ?? "UNKNOWN_HOSTNAME";
  }
}

const defaults: Record<string, string | boolean | number> = {
  debug: "false",
  packaged: "true",
  hostname: await getHostname(),
  cookies_max_age_sec: 3600 * 24 * 30,
  cookies_min_refresh_sec: 60 * 5,
  sentry_sample_rate: 1,
  sentry_traces_sample_rate: 1,
  version: await get_version(),
  trust_proxy: false,
  trust_header_ip: "X-Forwarded-For",
  tg_port: "7890",
};

const sources = [
  defaults,
  mapKeys(
    await load({
      envPath: "./.env",
      export: true,
    }),
    (k: string) => k.toLowerCase(),
  ),
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
  parse(Deno.args) as Record<string, unknown>,
];

const zbooleanstring = z.preprocess(
  (a: unknown) => z.coerce.string().parse(a) === "true",
  z.boolean(),
);

const schema = z.object({
  debug: zbooleanstring,
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: zbooleanstring,
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
  tg_external_url: z.string().url(),
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
  cookies_max_age_sec: z.coerce.number().positive().min(30),
  cookies_min_refresh_sec: z.coerce.number().positive().min(60),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.coerce.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.coerce.number().positive().min(0).max(1),
  version: z.string(),
  trust_proxy: zbooleanstring,
  trust_header_ip: z.string(),
  request_log: z.string().optional(),
});

const parsing = await schema.safeParse(
  sources.reduce((a, b) => deepMerge(a, b), {}),
);

if (!parsing.success) {
  getLogger().error(parsing.error);
  Deno.exit(1);
}

const { data: config } = parsing;

export default config;

export const redisConfig: RedisConnectOptions = {
  hostname: config.redis_url.hostname,
  port: config.redis_url.port,
  ...config.redis_url.password.length > 0
    ? { password: config.redis_url.password }
    : {},
  db: parseInt(config.redis_url.pathname.substring(1), 10),
};
