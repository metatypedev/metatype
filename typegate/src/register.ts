// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Engine, initTypegraph } from "./engine.ts";
import { RedisReplicatedMap } from "./replicated_map.ts";
import { RedisConnectOptions } from "redis";
import { SystemTypegraph } from "./system_typegraphs.ts";

export abstract class Register {
  abstract set(payload: string): Promise<string>;

  abstract remove(name: string): Promise<void>;

  abstract list(): Engine[];

  abstract get(name: string): Engine | undefined;

  abstract has(name: string): boolean;
}

export class ReplicatedRegister extends Register {
  static async init(
    redisConfig: RedisConnectOptions,
  ): Promise<ReplicatedRegister> {
    const replicatedMap = await RedisReplicatedMap.init<Engine>(
      "typegraph",
      redisConfig,
      (engine) => JSON.stringify(engine.tg.tg),
      (payload) => initTypegraph(payload, true),
    );

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(private replicatedMap: RedisReplicatedMap<Engine>) {
    super();
  }

  async set(payload: string): Promise<string> {
    const engine = await initTypegraph(
      payload,
      false,
      SystemTypegraph.getCustomRuntimes(this),
    );
    if (SystemTypegraph.check(engine.name)) {
      // no need for a sync
      this.replicatedMap.memory.set(engine.name, engine);
    } else {
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
