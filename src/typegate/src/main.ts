// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { init_native } from "native";

import {
  defaultTypegateConfigBase,
  getTypegateConfig,
  globalConfig,
} from "./config.ts";
import { Typegate } from "./typegate/mod.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import * as Sentry from "sentry";
import { getLogger } from "./log.ts";
import { init_runtimes } from "./runtimes/mod.ts";

const logger = getLogger(import.meta);

try {
  logger.debug(Deno.inspect(globalConfig));
  logger.info(`typegate v${globalConfig.version} starting`);

  Sentry.init({
    dsn: globalConfig.sentry_dsn,
    release: globalConfig.version,
    environment: globalConfig.debug ? "development" : "production",
    sampleRate: globalConfig.sentry_sample_rate,
    tracesSampleRate: globalConfig.sentry_traces_sample_rate,
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

  const config = getTypegateConfig({
    base: defaultTypegateConfigBase,
  });
  const typegate = await Typegate.init(config);

  await SystemTypegraph.loadAll(typegate, !globalConfig.packaged);

  const server = Deno.serve(
    { port: globalConfig.tg_port },
    (req, connInfo) => typegate.handle(req, connInfo.remoteAddr),
  );

  getLogger().info(`typegate ready on :${server.addr.port}`);

  await server.finished;
} catch (err) {
  logger.error(Deno.inspect(err));
  throw err;
}
