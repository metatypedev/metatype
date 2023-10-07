// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Register } from "../../src/typegate/register.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, QueryEngine>();

  constructor() {
    super();
  }

  add(engine: QueryEngine): Promise<void> {
    this.map.set(engine.name, engine);
    return Promise.resolve();
  }
  remove(name: string): Promise<void> {
    this.map.delete(name);
    return Promise.resolve();
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
}
