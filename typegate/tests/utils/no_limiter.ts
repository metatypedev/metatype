// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { RateLimiter } from "../../src/rate_limiter.ts";

export class NoLimiter extends RateLimiter {
  constructor() {
    super();
  }
  decr(_id: string, n: number): number | null {
    return n;
  }
  currentTokens(
    _id: string,
    _windowSec: number,
    _windowBudget: number,
    _maxLocalHit: number,
  ): Promise<number> {
    return Promise.resolve(1);
  }
}
