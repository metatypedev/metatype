// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Register } from "../../src/typegate/register.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, QueryEngine>();

  constructor() {
    super();
  }

  async add(engine: QueryEngine): Promise<void> {
    const old = this.map.get(engine.name);
    this.map.set(engine.name, engine);
    if (old) {
      await old.terminate();
    }
  }

  async remove(name: string): Promise<void> {
    const old = this.map.get(name);
    if (old) {
      this.map.delete(name);
      await old.terminate();
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
}
