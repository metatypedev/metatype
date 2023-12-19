// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { deferred } from "std/async/deferred.ts";
import { init_native } from "native";

import { Register, ReplicatedRegister } from "./typegate/register.ts";
import config, { redisConfig } from "./config.ts";
import { Typegate } from "./typegate/mod.ts";
import { RateLimiter, RedisRateLimiter } from "./typegate/rate_limiter.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import * as Sentry from "sentry";
import { getLogger } from "./log.ts";
import { init_runtimes } from "./runtimes/mod.ts";
import { MemoryRegister } from "test-utils/memory_register.ts";
import { NoLimiter } from "test-utils/no_limiter.ts";

const logger = getLogger(import.meta);
logger.info(`typegate v${config.version} starting`);

Sentry.init({
  dsn: config.sentry_dsn,
  release: config.version,
  environment: config.debug ? "development" : "production",
  sampleRate: config.sentry_sample_rate,
  tracesSampleRate: config.sentry_traces_sample_rate,
  integrations: [
    new Sentry.Integrations.Context({
      app: true,
      os: true,
      device: true,
      culture: true,
    }),
  ],
  debug: true,
});

addEventListener("unhandledrejection", (e) => {
  Sentry.captureException(e);
  logger.error(e);
  e.preventDefault();
});

// init rust native libs
init_native();

// load all runtimes
await init_runtimes();

const deferredTypegate = deferred<Typegate>();
let register: Register | undefined;
let limiter: RateLimiter | undefined;

try {
  // throw "Stop";
  register = await ReplicatedRegister.init(deferredTypegate, redisConfig);
  limiter = await RedisRateLimiter.init(redisConfig);
} catch (err) {
  logger.warning(err);
  logger.warning("Entering Redis-less mode");
  register = new MemoryRegister();
  limiter = new NoLimiter();
}

const typegate = new Typegate(register!, limiter!);

deferredTypegate.resolve(typegate);

if (register instanceof ReplicatedRegister) {
  const lastSync = await register.historySync().catch((err) => {
    logger.error(err);
    throw new Error(`failed to load history at boot, aborting: ${err.message}`);
  });
  register.startSync(lastSync);
}

await SystemTypegraph.loadAll(typegate, !config.packaged);

const server = Deno.serve(
  { port: config.tg_port },
  (req, connInfo) => typegate.handle(req, connInfo),
);

getLogger().info(`typegate ready on ${config.tg_port}`);

await server.finished;
