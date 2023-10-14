// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { QueryEngine } from "../../src/engine/query_engine.ts";
import { Register } from "../../src/typegate/register.ts";

export class SingleRegister extends Register {
  constructor(private name: string, private engine: QueryEngine) {
    super();
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
}
