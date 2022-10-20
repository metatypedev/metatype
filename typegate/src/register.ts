// Copyright Metatype under the Elastic License 2.0.

import { Engine, initTypegraph } from "./engine.ts";
import { RedisReplicatedMap } from "./replicated_map.ts";
import { RedisConfig } from "./config.ts";
import { SystemTypegraph } from "./system_typegraphs.ts";
import { RuntimesConfig } from "./types.ts";

console.log("init replicated map");

export abstract class Register {
  abstract set(payload: string, config?: RuntimesConfig): Promise<string>;

  abstract remove(name: string): Promise<void>;

  abstract list(): Engine[];

  abstract get(name: string): Engine | undefined;

  abstract has(name: string): boolean;
}

export class ReplicatedRegister extends Register {
  static async init(redisConfig: RedisConfig): Promise<ReplicatedRegister> {
    const replicatedMap = await RedisReplicatedMap.init<Engine>(
      "typegraph",
      redisConfig,
      (engine) => JSON.stringify(engine.tg.tg),
      (payload) => initTypegraph(payload),
    );

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(private replicatedMap: RedisReplicatedMap<Engine>) {
    super();
  }

  async set(payload: string, config?: RuntimesConfig): Promise<string> {
    const engine = await initTypegraph(
      payload,
      SystemTypegraph.getCustomRuntimes(this),
      config,
    );
    if (SystemTypegraph.check(engine.name)) {
      // no need for a sync
      this.replicatedMap.memory.set(engine.name, engine);
    } else {
      console.debug(`registering (replicated): ${engine.name}`);
      await this.replicatedMap.set(engine.name, engine);
    }

    return engine.name;
  }

  async remove(name: string): Promise<void> {
    if (name === "typegate" || !this.has(name)) {
      return;
    }
    await this.get(name)!.terminate();
    await this.replicatedMap.delete(name);
  }

  list(): Engine[] {
    return Array.from(this.replicatedMap.memory.values());
  }

  get(name: string): Engine | undefined {
    return this.replicatedMap.get(name);
  }

  has(name: string): boolean {
    return this.replicatedMap.has(name);
  }

  startSync(): void {
    this.replicatedMap.startSync();
  }
}
