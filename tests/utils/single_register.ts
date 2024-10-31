// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { QueryEngine } from "@metatype/typegate/engine/query_engine.ts";
import { Register } from "@metatype/typegate/typegate/register.ts";

export class SingleRegister extends Register {
  constructor(private name: string, private engine: QueryEngine) {
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
}
