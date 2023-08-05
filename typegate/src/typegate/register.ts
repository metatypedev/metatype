// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../engine.ts";
import { RedisReplicatedMap } from "../replicated_map.ts";
import { RedisConnectOptions, XIdInput } from "redis";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { decrypt, encrypt } from "../crypto.ts";
import { SecretManager, TypeGraphDS } from "../typegraph/mod.ts";
import { Typegate } from "./mod.ts";
import {
  isTypegraphUpToDate,
  upgradeTypegraph,
} from "../typegraph/versions.ts";

export interface MessageEntry {
  type: "info" | "warning" | "error";
  text: string;
}

export interface Migrations {
  runtime: string;
  migrations: string;
}

export abstract class Register {
  abstract add(engine: Engine): Promise<void>;

  abstract remove(name: string): Promise<void>;

  abstract list(): Engine[];

  abstract get(name: string): Engine | undefined;

  abstract has(name: string): boolean;
}

export class ReplicatedRegister extends Register {
  static async init(
    deferredTypegate: Promise<Typegate>,
    redisConfig: RedisConnectOptions,
  ): Promise<ReplicatedRegister> {
    const replicatedMap = await RedisReplicatedMap.init<Engine>(
      "typegraph",
      redisConfig,
      async (engine: Engine) => {
        const encryptedSecrets = await encrypt(
          JSON.stringify(engine.tg.secretManager.secrets),
        );
        return JSON.stringify([engine.tg.tg, encryptedSecrets]);
      },
      async (json: string, initialLoad: boolean) => {
        const typegate = await deferredTypegate;
        const [tg, encryptedSecrets] = JSON.parse(json) as [
          TypeGraphDS,
          string,
        ];
        const secrets = JSON.parse(await decrypt(encryptedSecrets));

        // typegraph is updated while being pushed, this is only for iniial load
        const hasUpgrade = initialLoad && isTypegraphUpToDate(tg);

        // name without prefix
        const secretManager = new SecretManager(tg.types[0].title, secrets);
        const engine = await typegate.initEngine(
          hasUpgrade ? upgradeTypegraph(tg) : tg,
          secretManager,
          true,
          SystemTypegraph.getCustomRuntimes(typegate),
          true,
        );

        if (hasUpgrade) {
          // update typegraph in storage, will trigger replica reloads but that's ok
          replicatedMap.set(engine.name, engine);
        }

        return engine;
      },
    );

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(private replicatedMap: RedisReplicatedMap<Engine>) {
    super();
  }

  async add(engine: Engine): Promise<void> {
    if (SystemTypegraph.check(engine.name)) {
      // no need for a sync
      this.replicatedMap.memory.set(engine.name, engine);
    } else {
      await this.replicatedMap.set(engine.name, engine);
    }
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

  historySync(): Promise<XIdInput> {
    return this.replicatedMap.historySync();
  }

  startSync(xid: XIdInput): void {
    void this.replicatedMap.startSync(xid);
  }
}
