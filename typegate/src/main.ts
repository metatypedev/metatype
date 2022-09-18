import { serve } from "std/http/server.ts";
import * as Sentry from "sentry";
import { init } from "../../bindings/bindings.ts";

import { ReplicatedRegister } from "./register.ts";
import config from "./config.ts";
import { getLogger } from "./log.ts";
import { redisConfig } from "./redis.ts";
import { initTypegraph } from "./engine.ts";
import { TypeGateRuntime } from "./runtimes/TypeGateRuntime.ts";
import { typegate } from "./typegate.ts";

if (config.sentry_dsn) {
  Sentry.init({
    dsn: config.sentry_dsn,
    release: config.version,
    environment: config.debug ? "development" : "production",
    sampleRate: config.sentry_sample_rate,
    tracesSampleRate: config.sentry_traces_sample_rate,
  });
}

init();

export const defaultRegister = await ReplicatedRegister.init(redisConfig);
const typegateEngine = await initTypegraph(
  await Deno.readTextFile("./src/typegraphs/typegate.json"),
  { typegate: await TypeGateRuntime.init(defaultRegister) },
);
defaultRegister.startSync({ "typegate": typegateEngine });

const server = serve(
  typegate(defaultRegister),
  { port: config.tg_port },
);

if (config.debug && (config.tg_port === 7890 || config.tg_port === 7891)) {
  // deno-lint-ignore no-inner-declarations
  function reload(backoff = 1) {
    fetch(
      `http://localhost:5000/dev?node=${encodeURI(config.tg_external_url)}`,
    ).catch((e) => {
      getLogger().debug(e.message);
      if (backoff < 3) {
        setTimeout(reload, 1000 * backoff, backoff + 1);
      }
    });
  }
  setTimeout(reload, 200);
}

getLogger().info(`Listening on ${config.tg_port}`);

await server;
