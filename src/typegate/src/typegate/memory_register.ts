// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { QueryEngine } from "../engine/query_engine.ts";
import { Register } from "../typegate/register.ts";
import type { CachedResponse } from "@metatype/typegate/utils.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, QueryEngine>();
  private responseMemo = new Map<string, CachedResponse>();

  constructor() {
    super();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await Promise.all(
      Array.from(this.map.values()).map((engine) =>
        engine[Symbol.asyncDispose]()
      ),
    );
    this.map.clear();
  }

  async add(engine: QueryEngine): Promise<void> {
    const old = this.map.get(engine.name);
    this.map.set(engine.name, engine);
    if (old) {
      await old[Symbol.asyncDispose]();
    }
  }

  async remove(name: string): Promise<void> {
    const old = this.map.get(name);
    if (old) {
      this.map.delete(name);
      await old[Symbol.asyncDispose]();
    }
  }

  list(): QueryEngine[] {
    return Array.from(this.map.values());
  }

  get(name: string): QueryEngine | undefined {
    return this.map.get(name);
  }

  has(name: string): boolean {
    return this.map.has(name);
  }

  addResponse(key: string, response: CachedResponse): Promise<void> {
    this.responseMemo.set(key, response);
    return Promise.resolve();
  }

  deleteResponse(key: string): Promise<void> {
    this.responseMemo.delete(key);
    return Promise.resolve();
  }

  getResponse(key: string): CachedResponse | undefined {
    return this.responseMemo.get(key);
  }
}
