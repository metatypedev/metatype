import {
  connect,
  Redis,
  RedisConnectOptions,
  XIdInput,
} from "https://deno.land/x/redis@v0.25.5/mod.ts";
import * as Sentry from "sentry";
import config from "./config.ts";

export type RedisConfig = {
  hostname: string;
  port: string;
  password: string;
  db: number;
  maxRetryCount: number;
  retryInterval: number;
};

export const redisConfig: RedisConfig = {
  hostname: config.redis_url.hostname,
  port: config.redis_url.port,
  password: config.redis_url.password,
  db: parseInt(config.redis_url.pathname.substring(1), 10),
  maxRetryCount: 6,
  retryInterval: 5000,
};

type SyncContext = {
  start: (cursor: XIdInput) => AsyncIterableIterator<Record<string, string>>;
  process: Promise<void>;
  cancel: () => Promise<void>;
};

export class RedisReplicatedMap<T> {
  instance: string;
  redis: Redis;
  redisObs: Redis;
  memory: Map<string, T>;
  key: string;
  ekey: string;
  serializer: (elem: T) => Promise<string> | string;
  deserializer: (value: string) => Promise<T> | T;
  sync: SyncContext | null;

  private constructor(
    name: string,
    redis: Redis,
    redisObs: Redis,
    serializer: (elem: T) => Promise<string> | string,
    deserializer: (value: string) => Promise<T> | T,
  ) {
    this.instance = crypto.randomUUID();
    this.redis = redis;
    this.redisObs = redisObs;
    this.memory = new Map();
    this.key = name;
    this.ekey = `${name}_event`;
    this.serializer = serializer;
    this.deserializer = deserializer;
    this.sync = null;
  }

  static async init<T>(
    name: string,
    connection: RedisConnectOptions,
    serializer: (elem: T) => Promise<string> | string,
    deserializer: (value: string) => Promise<T> | T,
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
      serializer,
      deserializer,
    );
  }

  async startSync() {
    if (this.sync) {
      return;
    }
    const { key, redis, memory, deserializer } = this;
    this.sync = this.subscribe();

    const [lastMessage] = await redis.xrevrange(this.ekey, "+", "-", 1);
    const all = await redis.hgetall(key);
    for (let i = 0; i < all.length; i += 2) {
      const name = all[i];
      const payload = all[i + 1];
      memory.set(name, await deserializer(payload));
    }

    for await (
      const { name, event, instance } of this.sync.start(
        lastMessage ? lastMessage.xid : 0,
      )
    ) {
      if (this.instance == instance) {
        continue;
      }
      if (event === "+") {
        const payload = await redis.hget(key, name);
        if (!payload) {
          throw Error(`added message without payload ${name}`);
        }
        console.log(`adding ${name}`);
        memory.set(name, await deserializer(payload));
      } else if (event === "-") {
        console.log(`removing ${name}`);
        memory.delete(name);
      } else {
        throw Error(`unexpected message ${name} with ${event}`);
      }
    }
  }

  private subscribe(): SyncContext {
    const { ekey, redisObs } = this;

    // deno-lint-ignore no-this-alias
    const target = this;
    let loop = true;
    let start: (
      cursor: XIdInput,
    ) => AsyncIterableIterator<Record<string, string>> = async function* () {};

    const process = new Promise<void>((resolve) => {
      start = async function* (cursor: XIdInput) {
        const registry = new FinalizationRegistry(() => {
          loop = false;
        });
        registry.register(target, null);
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
            console.error(error);
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
    const { key, ekey, redis, serializer } = this;

    this.memory.set(name, elem);

    const p = redis.tx();
    await p.hset(key, name, await serializer(elem));
    await p.xadd(
      ekey,
      "*",
      { name, event: "+", instance: this.instance },
      { approx: true, elements: 10000 },
    );
    await p.flush();
  }

  get(name: string): T | undefined {
    return this.memory.get(name);
  }

  has(name: string): boolean {
    return this.memory.has(name);
  }

  async delete(name: string): Promise<number> {
    const { key, ekey, redis } = this;

    this.memory.delete(name);

    const p = redis.tx();
    const count = await p.hdel(key, name);
    await p.xadd(
      ekey,
      "*",
      { name, event: "-", instance: this.instance },
      { approx: true, elements: 10000 },
    );
    await p.flush();
    return count;
  }

  async filter(
    predicat: (elem: Record<string, string>) => boolean,
  ): Promise<number> {
    const { ekey, redis } = this;
    const [stream] = await redis.xread([{ key: ekey, xid: 0 }], { block: 1 });
    const out = stream.messages
      .filter((message) => predicat(message.fieldValues))
      .map((message) => message.xid);
    if (out.length < 1) {
      return 0;
    }
    return redis.xdel(ekey, ...out);
  }
}
