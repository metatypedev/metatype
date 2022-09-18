import { connect, Redis, RedisConnectOptions, RedisSubscription } from "redis";
import { Deferred, deferred } from "std/async/deferred.ts";

const nowSec = (): number => Math.ceil(new Date().valueOf() / 1000);

const countWaiterChannel = "counters";

export class RateLimiter {
  countWaiter: Map<string, Deferred<number>>;
  sub: RedisSubscription | null;
  backgroundWork: Map<number, Deferred<void>>;

  private constructor(
    private map: TTLMap,
    private redis: Redis,
    private redisPubSub: Redis,
    private window: number,
    private budget: number,
  ) {
    this.countWaiter = new Map();
    this.sub = null;
    this.backgroundWork = new Map();
  }

  static async init(
    connection: RedisConnectOptions,
    window: number,
    budget: number,
  ): Promise<RateLimiter> {
    const map = new TTLMap();
    const redis = await connect(connection);
    const redisPubSub = await connect(connection);
    return new RateLimiter(map, redis, redisPubSub, window, budget);
  }

  async terminate() {
    if (this.sub) {
      await this.sub.unsubscribe(countWaiterChannel);
      this.sub = null;
    }
    await Promise.all(this.backgroundWork.values());
    this.redis.close();
    this.redisPubSub.close();
    this.map.terminate();
  }

  async waitOnCount(counter: string): Promise<Deferred<number>> {
    const waiter = this.countWaiter.get(counter);
    if (waiter) {
      return waiter;
    }
    const newWaiter = deferred<number>();
    this.countWaiter.set(counter, newWaiter);

    if (!this.sub) {
      this.sub = await this.redisPubSub.subscribe(countWaiterChannel);

      (async () => {
        for await (const { message } of this.sub!.receive()) {
          const [counter, countRaw] = message.split("=");
          const waiter = this.countWaiter.get(counter);
          const count = Number(countRaw);

          if (waiter && count >= 0) {
            waiter.resolve(count);
            this.countWaiter.delete(counter);

            if (this.countWaiter.size === 0) {
              await this.sub!.unsubscribe(countWaiterChannel);
              this.sub = null;
              return;
            }
          }
        }
      })();
    }

    return newWaiter;
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

    const currentTokens = this.map.decrby(tokensKey, 1);
    if (currentTokens && currentTokens > 0) {
      return currentTokens;
    }

    const tx = this.redis.tx();
    tx.decrby(tokensKey, 1);
    tx.get(lastKey);
    const txRes = await tx.flush();

    let [count, last] = txRes.pop() as any;

    console.log(count, last);

    if (!last) {
      if (count === -1) {
        // own the newly added token
        const now = nowSec();
        count = Math.max(
          last
            ? Math.ceil((now - last) / this.window * this.budget) - 1
            : this.budget - 1,
          0,
        );

        const tx = this.redis.tx();
        tx.set(tokensKey, count);
        tx.set(lastKey, now);
        tx.expire(tokensKey, this.window);
        tx.expire(lastKey, this.window);
        tx.publish(countWaiterChannel, `${tokensKey}=${count}`);
        await tx.flush();
      } else if (count < -1) {
        const countDef = await this.waitOnCount(tokensKey);
        count = await countDef;
      } else {
        throw new Error("should never happen");
      }
    }

    this.map.set(tokensKey, count, this.window);
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
    const backgroundId = nowSec();
    if (this.backgroundWork.has(backgroundId)) {
      return;
    }

    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;

    const def = deferred<void>();
    this.backgroundWork.set(backgroundId, def);

    const tx = this.redis.tx();
    tx.eval(
      `
        local c = redis.call('DECRBY', KEYS[1], ARGV[1])
        if tonumber(c) < 0 then
            redis.call('SET', KEYS[1], '0')
            return '0'
        end
        return c
      `,
      [tokensKey],
      [n],
    );
    tx.get(lastKey);
    const txRes = await tx.flush();

    def.resolve();
    this.backgroundWork.delete(backgroundId);

    const [currentTokens, last] = txRes.pop() as any;
    if (currentTokens && last) {
      this.map.set(tokensKey, Number(currentTokens), Number(last));
    }
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

class RateLimit {
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
    if (globalBudget) {
      this.budget = Math.min(this.budget, globalBudget);
    }

    if (this.budget < 0) {
      throw new Error("Rate-limit reached");
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
      const now = nowSec();
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

  set(key: string, value: number, expire: number) {
    this.map.set(key, [value, nowSec() + expire]);
  }

  get(key: string): number | null {
    const [value, expiration] = this.map.get(key) ?? [];
    const now = nowSec();

    if (!value || !expiration) {
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
    const now = nowSec();

    if (!value || !expiration) {
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
