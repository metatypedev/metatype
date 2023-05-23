// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Engine } from "../../src/engine.ts";
import { PushResponse } from "../../src/hooks.ts";
import { Register, RegistrationResult } from "../../src/register.ts";
import { SystemTypegraph } from "../../src/system_typegraphs.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, Engine>();

  constructor(private introspection: boolean = false) {
    super();
  }

  async set(
    payload: string,
    secrets: Record<string, string>,
  ): Promise<RegistrationResult> {
    const engine = await Engine.init(
      payload,
      secrets,
      false,
      new PushResponse(),
      SystemTypegraph.getCustomRuntimes(this),
      this.introspection ? undefined : null, // no need to have introspection for tests
    );
    this.map.set(engine.name, engine);
    return {
      typegraphName: engine.name,
      messages: [],
      migrations: [],
      resetRequired: [],
    };
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
