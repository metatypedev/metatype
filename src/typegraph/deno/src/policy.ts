// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ContextCheck, MaterializerId } from "./gen/core.ts";
import { core } from "./sdk.ts";

type PolicyPerEffectAlt = {
  update?: Policy;
  delete?: Policy;
  create?: Policy;
  read?: Policy;
};

export class PolicyPerEffectObject {
  constructor(public readonly value: PolicyPerEffectAlt) {}
}

export default class Policy {
  constructor(
    public readonly _id: number,
    public readonly name: string,
  ) {}

  static public(): Policy {
    const [id, name] = core.getPublicPolicy();
    return new Policy(id, name);
  }

  static #serializeContext(check: string | RegExp | null): ContextCheck {
    if (check === null) {
      return "not_null";
    }
    if (typeof check === "string") {
      return { value: check };
    }
    if (!(check instanceof RegExp)) {
      throw new Error(
        "Invalid context check: expected null, string, or RegExp",
      );
    }
    return { pattern: check.source };
  }

  static context(key: string, check?: string | RegExp | null): Policy {
    const [id, name] = core.registerContextPolicy(
      key,
      Policy.#serializeContext(check ?? null),
    );
    return new Policy(id, name);
  }

  static internal(): Policy {
    const [id, name] = core.getInternalPolicy();
    return new Policy(id, name);
  }

  static create(name: string, materializerId: MaterializerId): Policy {
    return new Policy(
      core.registerPolicy({ name, materializer: materializerId }),
      name,
    );
  }

  /** create policy based on effects */
  static on(effects: PolicyPerEffectAlt): PolicyPerEffectObject {
    return new PolicyPerEffectObject(effects);
  }
}
