// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { Register, RegistrationResult } from "../../src/register.ts";

export class SingleRegister extends Register {
  constructor(private name: string, private engine: Engine) {
    super();
  }

  set(_payload: string): Promise<RegistrationResult> {
    return Promise.resolve({
      typegraphName: this.name,
      messages: [],
      migrations: [],
      resetRequired: [],
    });
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
