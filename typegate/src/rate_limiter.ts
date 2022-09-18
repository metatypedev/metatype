import {
  Bulk,
  connect,
  Redis,
  RedisConnectOptions,
  RedisSubscription,
} from "redis";
import { Deferred, deferred } from "std/async/deferred.ts";

const nowSec = (): number => Math.ceil(new Date().valueOf() / 1000);
const nullOrNumber = (b: Bulk) => b ? Number(b) : null;

const countWaiterChannel = "counters";

export class RateLimiter {
  countWaiter: Map<string, Deferred<number>>;
  sub: RedisSubscription | null;

  private constructor(
    private map: TTLMap,
    private redis: Redis,
    private redisPubSub: Redis,
    private window: number,
    private budget: number,
  ) {
    this.countWaiter = new Map();
    this.sub = null;
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
              await this.sub!.unsubscribe();
              this.sub = null;
              return;
            }
          }
        }
      })();
    }

    return newWaiter;
  }

  async currentTokens(typegraph: string, identifier: string): Promise<number> {
    const tokensKey = `${typegraph}:${identifier}:tokens`;
    const lastKey = `${typegraph}:${identifier}:last`;

    const currentTokens = this.map.decrby(tokensKey, 1);
    if (currentTokens && currentTokens > 0) {
      return currentTokens;
    }

    const tx = this.redis.tx();
    const countP = tx.decrby(tokensKey, 1);
    const lastP = tx.get(lastKey);
    await tx.flush();

    let count = await countP;
    const last = nullOrNumber(await lastP);

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
    typegraph: string,
    identifier: string,
    n: number,
  ): number | null {
    const tokensKey = `${typegraph}:${identifier}:tokens`;
    const lastKey = `${typegraph}:${identifier}:last`;

    const currentTokens = this.map.decrby(tokensKey, n);

    const tx = this.redis.tx();
    const currentTokensP = tx.decrby(tokensKey, n);
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
    const lastP = tx.get(lastKey);
    void Promise.all([tx.flush(), currentTokensP, lastP]).then(
      ([_, currentTokens, last]) => {
        if (currentTokens && last) {
          this.map.set(tokensKey, Number(currentTokens), Number(last));
        }
      },
    );

    return currentTokens;
  }

  async limit(
    typegraph: string,
    identifier: string,
    queryBudget: number,
  ): Promise<RateLimit> {
    const budget = await this.currentTokens(typegraph, identifier);
    return new RateLimit(
      this,
      typegraph,
      identifier,
      Math.min(budget, queryBudget - 1),
    );
  }
}

class RateLimit {
  consumed: number;

  constructor(
    private limiter: RateLimiter,
    private typegraph: string,
    private identifier: string,
    private budget: number,
  ) {
    this.consumed = 1;
  }

  consume(n: number) {
    this.consumed += n;
    this.budget = this.limiter.decr(this.typegraph, this.identifier, n) ??
      this.budget - n;

    if (this.budget <= 0) {
      throw new Error("Rate-limit reached");
    }
  }
}

const intervalFinalizer = new FinalizationRegistry((interval: number) => {
  clearInterval(interval);
});

class TTLMap {
  map: Map<string, [number, number]>;

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
    intervalFinalizer.register(this, gc);
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
