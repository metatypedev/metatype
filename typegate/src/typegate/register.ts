// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../engine/query_engine.ts";
import { RedisConnectOptions, XIdInput } from "redis";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { Typegate } from "./mod.ts";
import {
  isTypegraphUpToDate,
  upgradeTypegraph,
} from "../typegraph/versions.ts";
import { typegraphIdSchema, TypegraphStore } from "../sync/typegraph.ts";
import { RedisReplicatedMap } from "../sync/replicated_map.ts";

export interface MessageEntry {
  type: "info" | "warning" | "error";
  text: string;
}

export interface Migrations {
  runtime: string;
  migrations: string;
}

export abstract class Register {
  abstract add(engine: QueryEngine): Promise<void>;

  abstract remove(name: string): Promise<void>;

  abstract list(): QueryEngine[];

  abstract get(name: string): QueryEngine | undefined;

  abstract has(name: string): boolean;
}

export class ReplicatedRegister extends Register {
  static async init(
    typegate: Typegate,
    redisConfig: RedisConnectOptions,
    typegraphStore: TypegraphStore,
  ): Promise<ReplicatedRegister> {
    const replicatedMap = await RedisReplicatedMap.init<QueryEngine>(
      "typegraph",
      redisConfig,
      {
        async serialize(engine: QueryEngine) {
          const { name, hash, uploadedAt } = await typegraphStore.upload(
            engine.tg.tg,
            engine.tg.secretManager,
          );
          return JSON.stringify({ name, hash, uploadedAt });
        },
        async deserialize(json: string, initialLoad: boolean) {
          const typegraphId = typegraphIdSchema.parse(JSON.parse(json));

          const [tg, secretManager] = await typegraphStore.download(
            typegraphId,
          );

          // typegraph is updated while being pushed, this is only for initial load
          const hasUpgrade = initialLoad && isTypegraphUpToDate(tg);

          const engine = await typegate.initQueryEngine(
            hasUpgrade ? upgradeTypegraph(tg) : tg,
            secretManager,
            SystemTypegraph.getCustomRuntimes(typegate),
            true,
          );

          if (hasUpgrade) {
            // update typegraph in storage, will trigger replica reloads but that's ok
            replicatedMap.set(engine.name, engine);
          }

          return engine;
        },
        async terminate(engine: QueryEngine) {
          await engine.terminate();
        },
      },
    );

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(private replicatedMap: RedisReplicatedMap<QueryEngine>) {
    super();
  }

  async add(engine: QueryEngine): Promise<void> {
    if (SystemTypegraph.check(engine.name)) {
      // no need for a sync
      this.replicatedMap.memory.set(engine.name, engine);
    } else {
      await this.replicatedMap.set(engine.name, engine);
    }
  }

  async remove(name: string): Promise<void> {
    if (SystemTypegraph.check(name)) {
      // no need for a sync
      const old = this.replicatedMap.memory.get(name);
      if (old) {
        this.replicatedMap.memory.delete(name);
        await old.terminate();
      }
    } else {
      await this.replicatedMap.delete(name);
    }
  }

  list(): QueryEngine[] {
    return Array.from(this.replicatedMap.memory.values());
  }

  get(name: string): QueryEngine | undefined {
    return this.replicatedMap.get(name);
  }

  has(name: string): boolean {
    return this.replicatedMap.has(name);
  }

  historySync(): Promise<XIdInput> {
    return this.replicatedMap.historySync();
  }

  startSync(xid: XIdInput): void {
    void this.replicatedMap.startSync(xid);
  }

  async stopSync() {
    await this.replicatedMap.stopSync();
  }
}
