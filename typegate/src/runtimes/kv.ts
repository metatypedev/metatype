// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { connect, Redis } from "redis";
import { ComputeStage } from "../engine/query_engine.ts";
import { getLogger, Logger } from "../log.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { KvRuntimeData } from "../typegraph/types.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
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
    const connection = await connect({
      hostname: secretManager.secretOrFail(args.host as string),
      port: secretManager.secretOrNull(args.port as string) ?? "6379",
      password: secretManager.secretOrNull(args.password as string) ??
        "password",
    });
    const instance = new KvRuntime(typegraphName, connection);
    instance.logger.info("Registered KvRuntime");
    return instance;
  }

  deinit(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]> {
    const name = stage.props.materializer?.name;

    const resolver: Resolver = () => {
      if (name == "kv_set") {
        return async (key: string, value: string) => {
          await this.redis.set(key, value);
        };
      }

      if (name == "kv_get") {
        return async (key: string) => {
          return await this.redis.get(key);
        };
      }

      if (name == "kv_delete") {
        return async (key: string) => {
          return await this.redis.del(key);
        };
      }

      if (name == "kv_keys") {
        return async (filter: string | null) => {
          return await this.redis.keys(filter ?? "*");
        };
      }

      if (name == "kv_all") {
        return async (filter: string | null) => {
          return await this.redis.hgetall(filter ?? "*");
        };
      }
    };
    return [
      new ComputeStage({ ...stage.props, resolver }),
    ];
  }
}
