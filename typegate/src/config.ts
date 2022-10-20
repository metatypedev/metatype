// Copyright Metatype under the Elastic License 2.0.

import { z } from "zod";
import { getLogger } from "./log.ts";
import "std/dotenv/load.ts";
import { deepMerge } from "std/collections/deep_merge.ts";
import { mapKeys } from "std/collections/map_keys.ts";
import * as base64 from "std/encoding/base64.ts";
import { parse } from "std/flags/mod.ts";
import { get_version } from "native";

async function getHostname() {
  try {
    const cmd = Deno.run({ cmd: ["hostname"], stdout: "piped" });
    const stdout = await cmd.output();
    cmd.close();
    return new TextDecoder().decode(stdout).trim();
  } catch (e) {
    console.debug(`cannot use hostname binary (${e.message}), fallback to env`);
    return Deno.env.get("HOSTNAME");
  }
}

const defaults = {
  hostname: await getHostname(),
  cookies_max_age_sec: 3600 * 24 * 30,
  cookies_min_refresh_sec: 60 * 5,
  sentry_sample_rate: 1,
  sentry_traces_sample_rate: 1,
  version: await get_version(),
  trust_proxy: false,
  trust_header_ip: "X-Forwarded-For",
};

const sources = [
  defaults,
  parse(Deno.args) as Record<string, unknown>,
  mapKeys(Deno.env.toObject(), (k: string) => k.toLowerCase()),
];

const schema = z.object({
  debug: z.preprocess(
    (a: unknown) => z.string().parse(a) === "true",
    z.boolean(),
  ),
  // To be set to false when running from source.
  // If false, auto reload system typegraphs on change. Default: to true.
  packaged: z.preprocess(
    (a: unknown) => z.string().optional().parse(a) !== "false",
    z.boolean(),
  ),
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
  tg_port: z.preprocess(
    (a: unknown) => parseInt(z.string().parse(a), 10),
    z.number().positive().max(65535),
  ),
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
  cookies_max_age_sec: z.number().positive().min(30),
  cookies_min_refresh_sec: z.number().positive().min(60),
  sentry_dsn: z.string().optional(),
  sentry_sample_rate: z.number().positive().min(0).max(1),
  sentry_traces_sample_rate: z.number().positive().min(0).max(1),
  version: z.string(),
  trust_proxy: z.boolean(),
  trust_header_ip: z.string(),
  prisma_migration_folder: z.string().optional(),
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

export type RedisConfig = {
  hostname: string;
  port: string;
  password: string;
  db: number;
  maxRetryCount: number;
  retryInterval: number;
};

export const redisConfig: RedisConfig = {
  hostname: config.redis_url.hostname,
  port: config.redis_url.port,
  password: config.redis_url.password,
  db: parseInt(config.redis_url.pathname.substring(1), 10),
  maxRetryCount: 6,
  retryInterval: 5000,
};
