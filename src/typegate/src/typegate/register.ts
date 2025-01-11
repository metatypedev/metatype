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
import { setNamespaces } from "../transports/graphql/typegraph.ts";

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

          // temparary hack
          // FIXME why are namespaces not set??
          if (tg.meta.namespaces == null) {
            setNamespaces(tg);
          }

          // typegraph is updated while being pushed, this is only for initial load
          const hasUpgrade = (initialLoad && isTypegraphUpToDate(tg)) || true;
          console.log({ hasUpgrade });

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

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(public replicatedMap: RedisReplicatedMap<QueryEngine>) {
    super();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.replicatedMap[Symbol.asyncDispose]();
    await Promise.all(this.list().map((e) => e[Symbol.asyncDispose]()));
  }

  async add(engine: QueryEngine): Promise<void> {
    console.debug("meta", engine.tg.tg.meta);
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

  startSync(xid: XIdInput): void {
    void this.replicatedMap.startSync(xid);
  }
}
