// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../engine.ts";
import { RedisReplicatedMap } from "../replicated_map.ts";
import { RedisConnectOptions } from "redis";
import { SystemTypegraph } from "../system_typegraphs.ts";
import { decrypt, encrypt } from "../crypto.ts";
import { SecretManager, TypeGraphDS } from "../typegraph.ts";
import { Typegate } from "./mod.ts";

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
    getTypegate: () => Promise<Typegate>,
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
      async (json: string) => {
        const typegate = await getTypegate();
        const [tg, encryptedSecrets] = JSON.parse(json) as [
          TypeGraphDS,
          string,
        ];
        const secrets = JSON.parse(await decrypt(encryptedSecrets));
        // typegraph name without prefix
        const secretManager = new SecretManager(tg.types[0].title, secrets);
        return typegate.initEngine(
          tg,
          secretManager,
          true,
          SystemTypegraph.getCustomRuntimes(typegate),
          true,
        );
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

  startSync(): void {
    this.replicatedMap.startSync();
  }
}
