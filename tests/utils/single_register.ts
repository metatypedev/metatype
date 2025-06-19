// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";
import { Register } from "@metatype/typegate/typegate/register.ts";
import type { CachedResponse } from "@metatype/typegate/utils.ts";

export class SingleRegister extends Register {
  constructor(
    private name: string,
    private engine: QueryEngine,
    private responseMap: Map<string, CachedResponse>,
  ) {
    super();
  }

  [Symbol.asyncDispose](): Promise<void> {
    // not disposing engine because it's shared
    return Promise.resolve();
  }

  add(_engine: QueryEngine): Promise<void> {
    return Promise.resolve();
  }

  remove(_name: string): Promise<void> {
    return Promise.resolve();
  }

  list(): QueryEngine[] {
    return [this.engine];
  }

  get(name: string): QueryEngine | undefined {
    return this.has(name) ? this.engine : undefined;
  }

  has(name: string): boolean {
    return name === this.name;
  }

  addResponse(key: string, response: CachedResponse): Promise<void> {
    this.responseMap.set(key, response);
    return Promise.resolve();
  }

  deleteResponse(key: string): Promise<void> {
    this.responseMap.delete(key);
    return Promise.resolve();
  }

  getResponse(key: string): CachedResponse | undefined {
    return this.responseMap.get(key);
  }
}
