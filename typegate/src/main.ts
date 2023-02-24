// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { serve } from "std/http/server.ts";
import { init_native } from "native";

import { ReplicatedRegister } from "./register.ts";
import config, { redisConfig } from "./config.ts";
import { typegate } from "./typegate.ts";
import { RedisRateLimiter } from "./rate_limiter.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";

import { getLogger } from "./log.ts";

// init rust native libs
init_native();

const register = await ReplicatedRegister.init(redisConfig);
register.startSync();
await SystemTypegraph.loadAll(register, !config.packaged);

const limiter = await RedisRateLimiter.init(redisConfig);

const server = serve(
  typegate(register, limiter),
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
