// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { Register } from "../../src/typegate/register.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, Engine>();

  constructor() {
    super();
  }

  add(engine: Engine): Promise<void> {
    this.map.set(engine.name, engine);
    return Promise.resolve();
  }
  remove(name: string): Promise<void> {
    this.map.delete(name);
    return Promise.resolve();
  }
  list(): Engine[] {
    return Array.from(this.map.values());
  }
  get(name: string): Engine | undefined {
    return this.map.get(name);
  }
  has(name: string): boolean {
    return this.map.has(name);
  }
}
