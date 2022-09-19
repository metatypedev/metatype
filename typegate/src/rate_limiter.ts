import { connect, Redis, RedisConnectOptions } from "redis";
import { Deferred, deferred } from "std/async/deferred.ts";
import { sleep } from "./utils.ts";

const countWaiterChannel = "counters";
export const decrPosCmd = `
local e = redis.call('EXISTS', KEYS[1])
if e == 0 then
  return {-1, -1}
end
local c = redis.call('DECRBY', KEYS[1], ARGV[1])
local l = redis.call('GET', KEYS[2])
if tonumber(c) < 0 then
    redis.call('SET', KEYS[1], '0')
    return {0, l}
end
return {c, l}
`;

export const decrCmd = `
local c = redis.call('DECRBY', KEYS[1], ARGV[1])
local l = redis.call('GET', KEYS[2])
return {c, l}
`;

export const addBugetCmd = `
redis.call('SET', KEYS[1], ARGV[1])
redis.call('SET', KEYS[2], ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
redis.call('EXPIRE', KEYS[2], ARGV[3])
`;

export class RateLimiter {
  countWaiter: Map<string, Deferred<number>>;
  backgroundWork: Map<number, Deferred<void>>;

  private constructor(
    private map: TTLMap,
    private redis: Redis,
    private windowSec: number,
    private budget: number,
  ) {
    this.countWaiter = new Map();
    this.backgroundWork = new Map();
  }

  static async init(
    connection: RedisConnectOptions,
    window: number,
    budget: number,
  ): Promise<RateLimiter> {
    const map = new TTLMap();
    const redis = await connect(connection);
    return new RateLimiter(map, redis, window, budget);
  }

  async terminate() {
    await this.awaitBackground();
    this.redis.close();
    this.map.terminate();
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
    const tokensKey = `${id}:tokens`;
    return this.map.get(tokensKey);
  }

  async reset(id: string): Promise<void> {
    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;
    const tx = this.redis.tx();
    tx.del(tokensKey);
    tx.del(lastKey);
    await tx.flush();
  }

  async currentTokens(id: string): Promise<number> {
    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;

    let count: number, last: number;

    do {
      const currentTokens = this.map.decrby(tokensKey, 1);
      if (currentTokens !== null && currentTokens > 0) {
        // do not block for 2nd calls
        void this.backgroundDecr(id, 1);
        console.log("DERIVE", currentTokens);

        return currentTokens;
      }

      const tx = await this.redis.eval(decrCmd, [tokensKey, lastKey], [1]);
      [count, last] = tx as any;

      console.log("COUNT", count, last);

      if (count === -1) {
        // own the newly added token
        const now = new Date().valueOf();
        const newBudget = Math.ceil(
          (now - last) / 1000 / this.windowSec * this.budget,
        );
        count = Math.max(
          (last ? newBudget : this.budget) - 1,
          0,
        );
        if (!last || (last && newBudget > 0)) {
          last = now;
        }
        console.log("OWNER", count);

        await this.redis.eval(addBugetCmd, [
          tokensKey,
          lastKey,
        ], [count, last, this.windowSec]);
      } else if (count < -1) {
        await sleep(10);
      }
    } while (count < -1);

    console.log("DERIVE", count);

    this.map.set(tokensKey, count, this.windowSec);
    return count;
  }

  decr(
    id: string,
    n: number,
  ): number | null {
    const tokensKey = `${id}:tokens`;
    const currentTokens = this.map.decrby(tokensKey, n);
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
      this.map.set(tokensKey, Number(currentTokens), Number(last));
    }

    def.resolve();
    this.backgroundWork.delete(backgroundId);
  }

  async limit(
    id: string,
    queryBudget: number,
  ): Promise<RateLimit> {
    const budget = await this.currentTokens(id);
    return new RateLimit(
      this,
      id,
      Math.min(budget, queryBudget - 1),
    );
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

  set(key: string, value: number, expireSec: number) {
    this.map.set(key, [value, new Date().valueOf() + expireSec * 1000]);
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
