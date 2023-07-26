// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { connect, Redis, RedisConnectOptions } from "redis";
import { Deferred, deferred } from "std/async/deferred.ts";
import { Engine } from "../engine.ts";

// keys: tokens, latest
// args: n
export const decrPosCmd = `
local e = redis.call('EXISTS', KEYS[1])
if e == 0 then
  return {-1, -1}
end
local c = redis.call('DECRBY', KEYS[1], ARGV[1])
local l = tonumber(redis.call('GET', KEYS[2]))
if c < 0 then
    redis.call('SET', KEYS[1], '0')
    return {0, l}
end
return {c, l}
`.trim();

// keys: tokens, latest
// args: now, delta, window budget, window sec
export const getUpdateBudgetCmd = `
local c = redis.call('DECR', KEYS[1])
local l = tonumber(redis.call('GET', KEYS[2]))
if c == -1 then
  if not l then 
    c = math.max(0, ARGV[3] - 1)
    l = tonumber(ARGV[1])
  else
    local newbudget = math.ceil((ARGV[1] - l) * ARGV[2])
    c = math.max(0, newbudget - 1)
    if newbudget > 0 then
      l = tonumber(ARGV[1])
    end
  end
  redis.call('SET', KEYS[1], c)
  redis.call('SET', KEYS[2], l)
  redis.call('EXPIRE', KEYS[1], ARGV[4])
  redis.call('EXPIRE', KEYS[2], ARGV[4])
end
return {c, l}
`.trim();

export abstract class RateLimiter {
  abstract decr(
    id: string,
    n: number,
  ): number | null;

  abstract currentTokens(
    id: string,
    windowSec: number,
    windowBudget: number,
    maxLocalHit: number,
  ): Promise<number>;

  getLimitForEngine(
    engine: Engine,
    identifier: string,
  ): Promise<RateLimit | null> {
    if (
      !engine.tg.tg.meta.rate ||
      // FIX bad serialization of rate (current: array if no object)
      Array.isArray(engine.tg.tg.meta.rate)
    ) {
      return Promise.resolve(null);
    }
    return this.getLimit(
      `${engine.name}:${identifier}`,
      engine.tg.tg.meta.rate.query_limit,
      engine.tg.tg.meta.rate.window_sec,
      engine.tg.tg.meta.rate.window_limit,
      engine.tg.tg.meta.rate.local_excess,
    );
  }

  async getLimit(
    id: string,
    queryBudget: number,
    windowSec: number,
    windowBudget: number,
    maxLocalHit: number,
  ): Promise<RateLimit> {
    const budget = await this.currentTokens(
      id,
      windowSec,
      windowBudget,
      maxLocalHit,
    );
    return new RateLimit(
      this,
      id,
      Math.min(budget, queryBudget - 1),
    );
  }
}

export class RedisRateLimiter extends RateLimiter {
  localHit: TTLMap;
  local: TTLMap;
  backgroundWork: Map<number, Deferred<void>>;

  private constructor(
    private redis: Redis,
  ) {
    super();
    this.localHit = new TTLMap();
    this.local = new TTLMap();
    this.backgroundWork = new Map();
  }

  static async init(
    connection: RedisConnectOptions,
  ): Promise<RedisRateLimiter> {
    const redis = await connect(connection);
    return new RedisRateLimiter(redis);
  }

  async terminate() {
    await this.awaitBackground();
    this.redis.close();
    this.local.terminate();
    this.localHit.terminate();
  }

  async awaitBackground() {
    await Promise.all(this.backgroundWork.values());
  }

  async getGlobal(id: string): Promise<number | null> {
    const tokensKey = `${id}:tokens`;
    const count = await this.redis.get(tokensKey);
    return count ? Number(count) : null;
  }

  getLocal(id: string): number | null {
    return this.local.get(id);
  }

  async reset(id: string): Promise<void> {
    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;
    const tx = this.redis.tx();
    tx.del(tokensKey);
    tx.del(lastKey);
    await tx.flush();
  }

  async currentTokens(
    id: string,
    windowSec: number,
    windowBudget: number,
    maxLocalHit: number,
  ): Promise<number> {
    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;

    const hit = this.localHit.incrby(id, 1);

    if (hit && maxLocalHit > 0 && hit <= maxLocalHit) {
      const currentTokens = this.local.decrby(id, 1);
      if (currentTokens !== null && currentTokens > 0) {
        // do not block
        void this.backgroundDecr(id, 1);
        return currentTokens;
      }
    }

    const now = new Date().valueOf();
    const delta = 1 / 1000 / windowSec * windowBudget;
    const tx = await this.redis.eval(getUpdateBudgetCmd, [tokensKey, lastKey], [
      now,
      delta,
      windowBudget,
      windowSec,
    ]);
    const [count, last] = tx as any;

    this.local.set(id, count, last);
    this.localHit.set(id, 1, last);
    return count;
  }

  decr(
    id: string,
    n: number,
  ): number | null {
    const currentTokens = this.local.decrby(id, n);
    void this.backgroundDecr(id, n);
    return currentTokens;
  }

  async backgroundDecr(id: string, n: number): Promise<void> {
    const backgroundId = new Date().valueOf();
    if (this.backgroundWork.has(backgroundId)) {
      return;
    }

    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;

    const def = deferred<void>();
    this.backgroundWork.set(backgroundId, def);

    const tx = await this.redis.eval(
      decrPosCmd,
      [tokensKey, lastKey],
      [n],
    );

    const [currentTokens, last] = tx as any;

    // if -1, the global limit is already gone and we know local < global
    if (currentTokens !== -1 && last !== -1) {
      this.local.set(id, currentTokens, last);
    }

    def.resolve();
    this.backgroundWork.delete(backgroundId);
  }
}

export class RateLimit {
  consumed: number;

  constructor(
    private limiter: RateLimiter,
    private id: string,
    public budget: number,
  ) {
    this.consumed = 1;
  }

  consume(n: number) {
    this.consumed += n;
    this.budget -= n;

    const globalBudget = this.limiter.decr(this.id, n);
    if (globalBudget !== null) {
      this.budget = Math.min(this.budget, globalBudget);
    }

    if (this.budget < 0) {
      throw new Error("rate-limited");
    }
  }
}

const intervalFinalizer = new FinalizationRegistry((interval: number) => {
  clearInterval(interval);
});

class TTLMap {
  map: Map<string, [number, number]>;
  gc: number;

  constructor() {
    const map = new Map();
    this.map = map;
    const gc = setInterval(() => {
      const now = new Date().valueOf();
      for (const [key, [_value, expiration]] of map.entries()) {
        if (expiration <= now) {
          map.delete(key);
        }
      }
    }, 100);
    this.gc = gc;
    intervalFinalizer.register(this, gc);
  }

  terminate() {
    clearInterval(this.gc);
  }

  set(key: string, value: number, expireAtSec: number) {
    this.map.set(key, [value, expireAtSec * 1000]);
  }

  get(key: string): number | null {
    const [value, expiration] = this.map.get(key) ?? [];
    const now = new Date().valueOf();

    if (value === undefined || expiration === undefined) {
      return null;
    }

    if (expiration <= now) {
      this.map.delete(key);
      return null;
    }

    return value;
  }

  incrby(key: string, n: number): number | null {
    return this.decrby(key, -n);
  }

  decrby(key: string, n: number): number | null {
    const [value, expiration] = this.map.get(key) ?? [];
    const now = new Date().valueOf();

    if (value === undefined || expiration === undefined) {
      return null;
    }

    if (expiration <= now) {
      this.map.delete(key);
      return null;
    }

    const newValue = value - n;
    this.set(key, newValue, expiration);
    return newValue;
  }
}
