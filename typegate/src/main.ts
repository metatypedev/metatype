// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { init_native } from "native";

import config from "./config.ts";
import { Typegate } from "./typegate/mod.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import * as Sentry from "sentry";
import { getLogger } from "./log.ts";
import { init_runtimes } from "./runtimes/mod.ts";
import { syncConfigFromEnv } from "./sync/config.ts";

const logger = getLogger(import.meta);

try {
  logger.debug(Deno.inspect(config));
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

  addEventListener("unhandledrejection", (err) => {
    Sentry.captureException(err);
    logger.error(Deno.inspect(err));
    err.preventDefault();
  });

  // init rust native libs
  init_native();

  // load all runtimes
  await init_runtimes();

  const syncConfig = await syncConfigFromEnv(["vars", "args"]);
  const typegate = await Typegate.init(syncConfig);

  await SystemTypegraph.loadAll(typegate, !config.packaged);

  const server = Deno.serve(
    { port: config.tg_port },
    (req, connInfo) => typegate.handle(req, connInfo),
  );

  getLogger().info(`typegate ready on ${config.tg_port}`);

  await server.finished;
} catch (err) {
  logger.error(Deno.inspect(err));
  throw err;
}
