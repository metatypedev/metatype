// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { connect, Redis } from "redis";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { KvRuntimeData } from "../typegraph/types.ts";

const logger = getLogger(import.meta);

@registerRuntime("kv")
export class KvRuntime extends Runtime {
  private logger: Logger;
  private memory = new Map<string, string>();

  private constructor(typegraphName: string, private redis: Redis) {
    super(typegraphName);
    this.logger = getLogger(`kv:'${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing KvRuntime");
    logger.debug(`init params: ${JSON.stringify(params)}`);
    const { typegraph, args } = params as RuntimeInitParams<KvRuntimeData>;
    const typegraphName = TypeGraph.formatName(typegraph);
    const connection = await connect({
      hostname: args.host ?? "localhost",
      port: args.port ?? "6379",
    });
    const instance = new KvRuntime(typegraphName, connection);
    instance.logger.info("registerd KvRuntime");
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
        return (key: string, value: string) => {
          this.memory.set(key, value);
        };
      }

      if (name == "kv_get") {
        return (key: string) => {
          return this.memory.get(key);
        };
      }

      if (name == "kv_delete") {
        return (key: string) => {
          return this.memory.delete(key);
        };
      }

      if (name == "kv_keys") {
        return () => {
          return Array.from(this.memory.keys());
        };
      }

      if (name == "kv_all") {
        return () => {
          return Array.from(this.memory.entries());
        };
      }
    };
    return [
      new ComputeStage({ ...stage.props, resolver }),
    ];
  }
}
