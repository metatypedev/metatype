// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { connect, parseURL, type Redis } from "redis";
import { ComputeStage } from "../engine/query_engine.ts";
import { getLogger, type Logger } from "../log.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import type { KvRuntimeData } from "../typegraph/types.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import { registerRuntime } from "./mod.ts";
import { Runtime } from "./Runtime.ts";

const logger = getLogger(import.meta);

@registerRuntime("kv")
export class KvRuntime extends Runtime {
  private logger: Logger;
  private redis: Redis;

  private constructor(typegraphName: string, redis: Redis) {
    super(typegraphName);
    this.logger = getLogger(`kv:'${typegraphName}'`);
    this.redis = redis;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("Initializing KvRuntime");
    logger.debug(`Init params: ${JSON.stringify(params)}`);
    const { typegraph, args, secretManager } = params as RuntimeInitParams<
      KvRuntimeData
    >;
    const typegraphName = TypeGraph.formatName(typegraph);
    const url = secretManager.secretOrFail(args.url);
    const redisConnectionOption = parseURL(url);
    const connection = await connect(redisConnectionOption);
    const instance = new KvRuntime(typegraphName, connection);
    instance.logger.info("Registered KvRuntime");

    return instance;
  }

  // deno-lint-ignore require-await
  async deinit(): Promise<void> {
    this.redis.close();
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    const name = stage.props.materializer?.name;

    const resolver: Resolver = async (args) => {
      if (name == "kv_set") {
        const { key, value } = args;
        return await this.redis.set(key, value);
      }

      if (name == "kv_get") {
        const { key } = args;
        return await this.redis.get(key);
      }

      if (name == "kv_delete") {
        const { key } = args;
        return await this.redis.del(key);
      }

      if (name == "kv_keys") {
        const { filter } = args;
        return await this.redis.keys(filter ?? "*");
      }

      if (name === "kv_values") {
        const { filter } = args;
        const keys = await this.redis.keys(filter ?? "*");
        const values = await Promise.all(
          keys.map(async (key) => {
            const value = await this.redis.get(key);
            return value;
          }),
        );
        return values;
      }
    };
    return [new ComputeStage({ ...stage.props, resolver })];
  }
}
