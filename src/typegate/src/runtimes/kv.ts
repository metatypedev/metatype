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

    let resolver: Resolver;
    if (name == "kv_set") {
      resolver = async (args) => {
        const { key, value } = args;
        return await this.redis.set(key, value);
      };
    } else if (name == "kv_get") {
      resolver = async (args) => {
        const { key } = args;
        const resp = await this.redis.get(key);
        return resp;
      };
    } else if (name == "kv_delete") {
      resolver = async (args) => {
        const { key } = args;
        return await this.redis.del(key);
      };
    } else if (name == "kv_keys") {
      resolver = async (args) => {
        const { filter } = args;
        return await this.redis.keys(filter ?? "*");
      };
    } else if (name === "kv_values") {
      resolver = async (args) => {
        const { filter } = args;
        const keys = await this.redis.keys(filter ?? "*");
        const values = await Promise.all(
          keys.map(async (key: unknown) => {
            const value = await this.redis.get(key);
            return value;
          }),
        );
        return values;
      };
    } else {
      throw new Error(`unrecognized mat name: ${name}`);
    }
    return [new ComputeStage({ ...stage.props, resolver })];
  }
}
