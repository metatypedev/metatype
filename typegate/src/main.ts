// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { deferred } from "std/async/deferred.ts";
import { init_native } from "native";

import { ReplicatedRegister } from "./typegate/register.ts";
import config, { redisConfig } from "./config.ts";
import { Typegate } from "./typegate/mod.ts";
import { RedisRateLimiter } from "./typegate/rate_limiter.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import * as Sentry from "sentry";
import { getLogger } from "./log.ts";
import { init_runtimes } from "./runtimes/mod.ts";

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
const register = await ReplicatedRegister.init(
  deferredTypegate,
  redisConfig,
);
const limiter = await RedisRateLimiter.init(redisConfig);
const typegate = new Typegate(register, limiter);
deferredTypegate.resolve(typegate);

const lastSync = await register.historySync().catch((err) => {
  logger.error(err);
  throw new Error(`failed to load history at boot, aborting: {err.message}`);
});
register.startSync(lastSync);

await SystemTypegraph.loadAll(typegate, !config.packaged);

const server = Deno.serve(
  { port: config.tg_port },
  (req, connInfo) => typegate.handle(req, connInfo),
);

if (config.debug && (config.tg_port === 7890 || config.tg_port === 7891)) {
  // deno-lint-ignore no-inner-declarations
  function reload(backoff = 1) {
    fetch(
      `http://localhost:5000/dev?node=${encodeURI("http://localhost:7890")}`,
    ).catch((e) => {
      getLogger().debug(e.message);
      if (backoff < 3) {
        setTimeout(reload, 1000 * backoff, backoff + 1);
      }
    });
  }
  setTimeout(reload, 200);
}

getLogger().info(`typegate ready on ${config.tg_port}`);

await server;
