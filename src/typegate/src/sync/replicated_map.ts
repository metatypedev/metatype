// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  connect,
  type Redis,
  type RedisConnectOptions,
  type XIdInput,
} from "redis";
import * as Sentry from "sentry";
import { getLogger } from "../log.ts";
import { ensure } from "../utils.ts";
import { BaseError, ErrorKind } from "../errors.ts";

const logger = getLogger(import.meta);

class ReplicatedMapError extends BaseError {
  constructor(message: string) {
    super(import.meta, ErrorKind.Typegate, message, 500);
  }
}

type SyncContext = {
  start: (cursor: XIdInput) => AsyncIterableIterator<Record<string, string>>;
  process: Promise<void>;
  cancel: () => Promise<void>;
};

const ADD = "add";
const RM = "rm";

// Deno Redis driver library does not support well txs (MULTI), prefer Lua scripts to avoid bugs
const addCmd = /* lua */ `
redis.call('HSET', KEYS[1], ARGV[1], ARGV[3])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', '10000', '*', 'name', ARGV[1], 'event', '${ADD}', 'instance', ARGV[2])
`.trim();

const rmCmd = /* lua */ `
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('XADD', KEYS[2], 'MAXLEN', '~', '10000', '*', 'name', ARGV[1], 'event', '${RM}', 'instance', ARGV[2])
`.trim();

type Serializer<T> = (elem: T) => Promise<string> | string;
type Deserializer<T> = (value: string, initialLoad: boolean) => Promise<T> | T;
type TerminateHook<T> = (elem: T) => Promise<void> | void;

type RedisReplicatedMapOptions<T> = {
  serialize: Serializer<T>;
  deserialize: Deserializer<T>;
  terminate: TerminateHook<T>;
};

export class RedisReplicatedMap<T> implements AsyncDisposable {
  private instance: string;

  public memory: Map<string, T>;
  private key: string;
  private ekey: string;

  sync: SyncContext | null;

  static async init<T>(
    name: string,
    connection: RedisConnectOptions,
    { serialize, deserialize, terminate }: RedisReplicatedMapOptions<T>,
  ) {
    // needs two connections because
    // 1. xread with block delays other commands
    // 2. https://github.com/denodrivers/redis/issues/304

    const redis = await connect(connection);
    const redisObs = await connect(connection);
    return new RedisReplicatedMap<T>(
      name,
      redis,
      redisObs,
      serialize,
      deserialize,
      terminate,
    );
  }

  private constructor(
    name: string,
    private redis: Redis,
    private redisObs: Redis,
    private serializer: Serializer<T>,
    private deserializer: Deserializer<T>,
    private terminateHook: TerminateHook<T>,
  ) {
    this.instance = crypto.randomUUID();
    this.memory = new Map();
    this.key = name;
    this.ekey = `${name}_event`;
    this.sync = null;
  }

  async [Symbol.asyncDispose]() {
    if (this.sync) {
      await this.sync.cancel();
      this.sync = null;
    }

    this.redis.close();
    this.redisObs.close();
  }

  async getAllHistory() {
    const { key, redis } = this;
    const all = await redis.hgetall(key);
    const history = [];
    for (let i = 0; i < all.length; i += 2) {
      history.push({
        name: all[i],
        payload: all[i + 1],
      });
    }

    return history;
  }

  async historySync(): Promise<XIdInput> {
    const { redis, deserializer } = this;

    // get last received message before loading history
    const [lastMessage] = await redis.xrevrange(this.ekey, "+", "-", 1);
    const lastId = lastMessage ? lastMessage.xid : 0;
    logger.debug("last message loaded: {}", lastId);

    const all = await this.getAllHistory();
    logger.debug("history load start: {} elements", all.length);

    for (const { name, payload } of all) {
      logger.info(`reloaded addition: ${name}`);
      ensure(
        !this.memory.has(name),
        () => `typegraph ${name} should not exists in memory at first sync`,
      );

      const engine = await deserializer(payload, true);
      this.memory.set(name, engine);
    }
    logger.debug("history load end");

    return lastId;
  }

  private async memorySet(name: string, elem: T | null): Promise<void> {
    const { memory, terminateHook } = this;
    const old = memory.get(name);
    if (elem !== null) {
      this.memory.set(name, elem);
    } else {
      this.memory.delete(name);
    }
    if (old) {
      await terminateHook(old);
    }
  }

  // never terminating function
  async startSync(xid: XIdInput): Promise<void> {
    if (this.sync) {
      return;
    }
    const { key, redis, deserializer } = this;
    this.sync = this.subscribe();

    for await (
      const { name, event, instance } of this.sync.start(
        xid,
      )
    ) {
      if (this.instance == instance) {
        continue;
      }
      if (event === ADD) {
        const payload = await redis.hget(key, name);
        if (!payload) {
          throw new ReplicatedMapError(`added message without payload ${name}`);
        }
        logger.info(`received addition {}`, { name });
        await this.memorySet(name, await deserializer(payload, false));
      } else if (event === RM) {
        logger.info(`received removal {}`, { name });
        await this.memorySet(name, null);
      } else {
        throw new ReplicatedMapError(
          `unexpected message ${name} with ${event}`,
        );
      }
    }
  }

  private subscribe(): SyncContext {
    const { ekey, redisObs } = this;

    let loop = true;
    let start: (
      cursor: XIdInput,
    ) => AsyncIterableIterator<Record<string, string>> = async function* () {};

    const process = new Promise<void>((resolve) => {
      start = async function* (cursor: XIdInput) {
        while (loop) {
          try {
            const [stream] = await redisObs.xread(
              [{ key: ekey, xid: cursor }],
              {
                block: 5000,
              },
            );
            if (!stream) {
              continue;
            }
            for (const { xid, fieldValues } of stream.messages) {
              yield fieldValues;
              cursor = xid;
            }
          } catch (error) {
            Sentry.captureException(error);
            logger.error(error);
          }
        }
        resolve();
      };
    });

    const cancel = (): Promise<void> => {
      loop = false;
      return process;
    };

    return { start, process, cancel };
  }

  async set(name: string, elem: T) {
    const { key, ekey, serializer, redis } = this;

    await this.memorySet(name, elem);
    logger.info(`sent addition {}`, { name, key, ekey, elem: !!elem });

    await redis.eval(
      addCmd,
      [key, ekey],
      [name, this.instance, await serializer(elem)],
    );
  }

  get(name: string): T | undefined {
    return this.memory.get(name);
  }

  has(name: string): boolean {
    return this.memory.has(name);
  }

  async delete(name: string): Promise<void> {
    const { key, ekey, redis } = this;

    await this.memorySet(name, null);
    logger.info(`sent removal {}`, { name, key });

    await redis.eval(
      rmCmd,
      [key, ekey],
      [name, this.instance],
    );
  }
}
