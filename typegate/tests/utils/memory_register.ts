// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Engine, initTypegraph } from "../../src/engine.ts";
import { Register, RegistrationResult } from "../../src/register.ts";
import { SystemTypegraph } from "../../src/system_typegraphs.ts";

export class MemoryRegister extends Register {
  private map = new Map<string, Engine>();

  constructor(private introspection: boolean = false) {
    super();
  }

  async set(payload: string): Promise<RegistrationResult> {
    const engine = await initTypegraph(
      payload,
      false,
      null,
      SystemTypegraph.getCustomRuntimes(this),
      this.introspection ? undefined : null, // no need to have introspection for tests
    );
    this.map.set(engine.name, engine);
    return {
      typegraphName: engine.name,
      messages: [],
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
