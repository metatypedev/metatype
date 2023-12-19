// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Deferred, deferred } from "std/async/deferred.ts";
import { RateLimiter, TTLMap } from "./rate_limiter.ts";

interface ExpirableValue {
  value: number;
  insertionDateMs: number;
  expirationSec?: number;
}

export class RedisShim {
  map: Map<string, ExpirableValue>;

  constructor() {
    this.map = new Map();
  }

  set(key: string, value: number, expirationSec?: number) {
    this.map.set(key, {
      value,
      insertionDateMs: Date.now(),
      expirationSec,
    });
  }

  get(key: string): number | undefined {
    if (this.map.has(key)) {
      const entry = this.map.get(key)!;
      if (entry.expirationSec !== undefined) {
        const deltaMillis = Date.now() - entry.insertionDateMs;
        const deltaSec = Math.floor(deltaMillis / 1000);
        if (deltaSec >= entry.expirationSec) {
          this.map.delete(key);
        }
      }
    }
    return this.map.get(key)?.value;
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  decr(key: string): number {
    return this.decrBy(key, 1);
  }

  decrBy(key: string, amount: number): number {
    if (this.map.has(key)) {
      this.map.get(key)!.value -= amount;
    }
    // https://redis.io/commands/decrby/
    this.set(key, -amount);
    return -amount;
  }

  /** Reset this instance */
  close() {
    this.map = new Map();
  }

  getUpdateBudgetCmd(
    keys: { tokensKey: string; lastKey: string },
    args: {
      now: number;
      delta: number;
      windowBudget: number;
      windowSec: number;
    },
  ): Promise<[number, number]> {
    let c = this.decr(keys.tokensKey);
    let l = this.get(keys.lastKey);
    if (c == -1) {
      if (l === undefined) {
        c = Math.max(0, args.windowBudget - 1);
        l = args.now;
      } else {
        // local newbudget = math.ceil((ARGV[1] - l) * ARGV[2])
        const newBudget = Math.ceil((args.now - l) * args.delta);
        // c = math.max(0, newbudget - 1)
        c = Math.max(0, newBudget - 1);
        if (newBudget > 0) {
          l = args.delta;
        }
      }
    }

    this.set(keys.tokensKey, c, args.windowSec);
    this.set(keys.lastKey, l!, args.windowSec);

    return Promise.resolve([c, l!]);
  }

  decrPosCmd(
    keys: { tokensKey: string; lastKey: string },
    args: { n: number },
  ): Promise<[number, number]> {
    const e = this.map.has(keys.tokensKey) ? 0 : 1;
    if (e == 0) {
      return Promise.resolve([-1, -1]);
    }
    const c = this.decrBy(keys.tokensKey, args.n);
    const l = this.get(keys.lastKey);
    if (c < 0) {
      this.set(keys.tokensKey, 0);
      return Promise.resolve([0, l!]);
    }
    return Promise.resolve([c, l!]);
  }
}

export class MemoryRateLimiter extends RateLimiter {
  localHit: TTLMap;
  local: TTLMap;
  backgroundWork: Map<number, Deferred<void>>;

  constructor(
    private redis: RedisShim,
  ) {
    super();
    this.localHit = new TTLMap();
    this.local = new TTLMap();
    this.backgroundWork = new Map();
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

  reset(id: string): void {
    const tokensKey = `${id}:tokens`;
    const lastKey = `${id}:last`;
    this.redis.delete(tokensKey);
    this.redis.delete(lastKey);
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
    const [count, last] = await this.redis.getUpdateBudgetCmd(
      { tokensKey, lastKey },
      {
        now,
        delta,
        windowBudget,
        windowSec,
      },
    );

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

    const [currentTokens, last] = await this.redis.decrPosCmd(
      { tokensKey, lastKey },
      { n },
    );

    // if -1, the global limit is already gone and we know local < global
    if (currentTokens !== -1 && last !== -1) {
      this.local.set(id, currentTokens, last);
    }

    def.resolve();
    this.backgroundWork.delete(backgroundId);
  }
}
