// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { MaterializerId } from "./gen/interfaces/metatype-typegraph-core.js";
import { core } from "./wit.js";

interface PolicyPerEffectAlt {
  update?: Policy;
  delete?: Policy;
  create?: Policy;
  read?: Policy;
}

export class PolicyPerEffectObject {
  constructor(
    public readonly value: PolicyPerEffectAlt,
  ) {}
}

export default class Policy {
  constructor(public readonly _id: number, public readonly name: string) {}

  static public(): Policy {
    const [id, name] = core.getPublicPolicy();
    return new Policy(id, name);
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
    const [id, name] = core.getInternalPolicy();
    return new Policy(id, name);
  }

  static create(name: string, materializerId: MaterializerId): Policy {
    return new Policy(
      core.registerPolicy({ name, materializer: materializerId }),
      name,
    );
  }

  static on(effects: PolicyPerEffectAlt) {
    return new PolicyPerEffectObject(effects);
  }
}
