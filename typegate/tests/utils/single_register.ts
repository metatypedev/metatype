// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { Register } from "../../src/register.ts";

export class SingleRegister extends Register {
  constructor(private name: string, private engine: Engine) {
    super();
  }

  add(_engine: Engine): Promise<void> {
    return Promise.resolve();
  }

  remove(_name: string): Promise<void> {
    return Promise.resolve();
  }

  list(): Engine[] {
    return [this.engine];
  }

  get(name: string): Engine | undefined {
    return this.has(name) ? this.engine : undefined;
  }

  has(name: string): boolean {
    return name === this.name;
  }
}
