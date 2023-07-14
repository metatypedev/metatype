import { MaterializerId } from "../gen/exports/core.d.ts";
import { core, runtimes } from "./wit.ts";
import { DenoRuntime } from "./runtimes/deno.ts";

export default class Policy {
  constructor(public readonly _id: number, public readonly name: string) {}

  static public(): Policy {
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
    return new DenoRuntime().policy( // TODO move those defs in core
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
