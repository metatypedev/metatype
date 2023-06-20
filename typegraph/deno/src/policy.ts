import { MaterializerId } from "../gen/exports/core.d.ts";
// @deno-types="../gen/typegraph_core.d.ts"
import { core, runtimes } from "../gen/typegraph_core.js";
import { DenoRuntime } from "./runtimes/deno.ts";

export default class Policy {
  constructor(public readonly id: number, public readonly name: string) {}

  static public_(): Policy {
    return Policy.create(
      "__public",
      runtimes.getPredefinedDenoFunc({ name: "true" }),
    );
  }

  static context(key: string, check: string | RegExp): Policy {
    const [id, name] = core.registerContextPolicy(
      key,
      typeof check === "string"
        ? { tag: "value", val: check }
        : { tag: "pattern", val: check.source },
    );
    return new Policy(id, name);
  }

  static internal(): Policy {
    return new DenoRuntime().policy(
      "__internal",
      "(_, { context }) => context.provider === 'internal'",
    );
  }

  static create(name: string, materializerId: MaterializerId): Policy {
    return new Policy(
      core.registerPolicy({ name, materializer: materializerId }),
      name,
    );
  }
}
