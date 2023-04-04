// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Engine } from "./engine.ts";
import { RedisReplicatedMap } from "./replicated_map.ts";
import { RedisConnectOptions } from "redis";
import { SystemTypegraph } from "./system_typegraphs.ts";
import { decrypt, encrypt } from "./crypto.ts";

export interface MessageEntry {
  type: "info" | "warning" | "error";
  text: string;
}

export interface RegistrationResult {
  typegraphName: string;
  messages: Array<MessageEntry>;
}

export abstract class Register {
  abstract set(
    payload: string,
    secrets: Record<string, string>,
  ): Promise<RegistrationResult>;

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
      async (engine: Engine) => {
        const encryptedSecrets = await encrypt(
          JSON.stringify(engine.tg.secretManager.secrets),
        );
        return JSON.stringify([engine.tg.tg, encryptedSecrets]);
      },
      async (json: string) => {
        const [payload, encryptedSecrets] = JSON.parse(json);
        const secrets = JSON.parse(await decrypt(encryptedSecrets));
        return Engine.init(JSON.stringify(payload), secrets, true, null);
      },
    );

    return new ReplicatedRegister(replicatedMap);
  }

  constructor(private replicatedMap: RedisReplicatedMap<Engine>) {
    super();
  }

  async set(
    payload: string,
    secrets: Record<string, string>,
  ): Promise<RegistrationResult> {
    const messageOutput = [] as MessageEntry[];
    const engine = await Engine.init(
      payload,
      secrets,
      false,
      messageOutput,
      SystemTypegraph.getCustomRuntimes(this),
    );
    if (SystemTypegraph.check(engine.name)) {
      // no need for a sync
      this.replicatedMap.memory.set(engine.name, engine);
    } else {
      await this.replicatedMap.set(engine.name, engine);
    }

    return {
      typegraphName: engine.name,
      messages: messageOutput,
    };
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
