// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { init_native } from "native";

import config from "./config.ts";
import { Typegate } from "./typegate/mod.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import * as Sentry from "sentry";
import { configOrExit, getLogger } from "./log.ts";
import { init_runtimes } from "./runtimes/mod.ts";
import {
  syncConfigFromRaw,
  syncConfigSchemaNaked,
  validateSyncConfig,
} from "./sync/config.ts";
import { mapKeys } from "std/collections/map_keys.ts";
import { parse } from "std/flags/mod.ts";

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

  addEventListener("unhandledrejection", (e) => {
    Sentry.captureException(e);
    logger.error(e);
    e.preventDefault();
  });

  // init rust native libs
  init_native();

  // load all runtimes
  await init_runtimes();

  const syncConfigRaw = await configOrExit([
    mapKeys(
      Deno.env.toObject(),
      (k: string) => k.toLowerCase(),
    ),
    parse(Deno.args) as Record<string, unknown>,
  ], syncConfigSchemaNaked);

  const syncConfig = syncConfigFromRaw(validateSyncConfig(syncConfigRaw));
  const typegate = await Typegate.init(syncConfig);

  await SystemTypegraph.loadAll(typegate, !config.packaged);

  const server = Deno.serve(
    { port: config.tg_port },
    (req, connInfo) => typegate.handle(req, connInfo),
  );

  getLogger().info(`typegate ready on ${config.tg_port}`);

  await server.finished;
} catch (err) {
  logger.error(err);
  throw err;
}
