// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "../engine/query_engine.ts";
import type { RedisConnectOptions, XIdInput } from "redis";
import { SystemTypegraph } from "../system_typegraphs.ts";
import type { Typegate } from "./mod.ts";
import {
  isTypegraphUpToDate,
  upgradeTypegraph,
} from "../typegraph/versions.ts";
import { typegraphIdSchema, type TypegraphStore } from "../sync/typegraph.ts";
import { RedisReplicatedMap } from "../sync/replicated_map.ts";
import {
  type CachedResponse,
  CachedResponseSchema,
} from "@metatype/typegate/utils.ts";

export interface MessageEntry {
  type: "info" | "warning" | "error";
  text: string;
}

export interface Migrations {
  runtime: string;
  migrations: string;
}

export abstract class Register implements AsyncDisposable {
  abstract add(engine: QueryEngine): Promise<void>;

  abstract remove(name: string): Promise<void>;

  abstract list(): QueryEngine[];

  abstract get(name: string): QueryEngine | undefined;

  abstract has(name: string): boolean;

  abstract addResponse(key: string, response: CachedResponse): Promise<void>;

  abstract deleteResponse(key: string): Promise<void>;

  abstract getResponse(key: string): CachedResponse | undefined;

  abstract [Symbol.asyncDispose](): Promise<void>;
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
          await engine[Symbol.asyncDispose]();
        },
      },
    );

    const replicatedResponseMap = await RedisReplicatedMap.init<CachedResponse>(
      "typegraph_responses",
      redisConfig,
      {
        serialize(data: CachedResponse) {
          return JSON.stringify(data);
        },
        deserialize(json: string, _: boolean) {
          const raw = JSON.parse(json);
          const cachedResponse = CachedResponseSchema.parse(raw);
          return cachedResponse;
        },
        async terminate(_: CachedResponse) {},
      },
    );

    return new ReplicatedRegister(replicatedMap, replicatedResponseMap);
  }

  constructor(
    public replicatedMap: RedisReplicatedMap<QueryEngine>,
    public replicatedResponseMap: RedisReplicatedMap<CachedResponse>,
  ) {
    super();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.replicatedMap[Symbol.asyncDispose]();
    await this.replicatedResponseMap[Symbol.asyncDispose]();
    await Promise.all(this.list().map((e) => e[Symbol.asyncDispose]()));
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
        await old[Symbol.asyncDispose]();
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

  historySyncResponses(): Promise<XIdInput> {
    return this.replicatedResponseMap.historySync();
  }

  startSync(xid: XIdInput): void {
    void this.replicatedMap.startSync(xid);
  }

  startSyncResponses(xid: XIdInput): void {
    void this.replicatedResponseMap.startSync(xid);
  }

  addResponse(key: string, response: CachedResponse): Promise<void> {
    return this.replicatedResponseMap.set(key, response);
  }

  deleteResponse(key: string): Promise<void> {
    return this.replicatedResponseMap.delete(key);
  }

  getResponse(key: string): CachedResponse | undefined {
    return this.replicatedResponseMap.get(key);
  }
}
