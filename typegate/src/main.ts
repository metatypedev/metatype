import { serve } from "std/http/server.ts";
import * as Sentry from "sentry";
import { init } from "../../bindings/bindings.ts";

import { ReplicatedRegister } from "./register.ts";
import config, { redisConfig } from "./config.ts";
import { getLogger } from "./log.ts";
import { initTypegraph } from "./engine.ts";
import { TypeGateRuntime } from "./runtimes/typegate.ts";
import { typegate } from "./typegate.ts";
import { RedisRateLimiter } from "./rate_limiter.ts";

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

const register = await ReplicatedRegister.init(redisConfig);
const typegateEngine = await initTypegraph(
  await Deno.readTextFile("./src/typegraphs/typegate.json"),
  { typegate: await TypeGateRuntime.init(register) },
);
register.startSync({ "typegate": typegateEngine });

const limiter = await RedisRateLimiter.init(redisConfig);

const server = serve(
  typegate(register, limiter),
  { port: config.tg_port },
);

if (config.debug && (config.tg_port === 7890 || config.tg_port === 7891)) {
  // deno-lint-ignore no-inner-declarations
  function reload(backoff = 1) {
    fetch(
      `http://localhost:5000/dev?node=${encodeURI("http://127.0.0.1:7890")}`,
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
