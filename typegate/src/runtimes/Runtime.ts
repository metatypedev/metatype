// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { ComputeStage } from "../engine/query_engine.ts";
import { equal } from "std/assert/equal.ts";
import { Resolver } from "../types.ts";

export abstract class Runtime {
  readonly id: string;

  constructor(typegraphName: string, uuid = crypto.randomUUID()) {
    this.id = `${typegraphName}_${this.constructor.name}_${uuid}`;
  }

  abstract deinit(): Promise<void>;

  abstract materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[];

  static collectRelativeStages(
    base: ComputeStage,
    waitlist: ComputeStage[],
    cursor = 0,
  ): ComputeStage[] {
    const ret = [];
    while (cursor < waitlist.length) {
      const stage = waitlist[cursor];
      if (
        // parent
        (stage.props.parent?.id() === base.id() ||
          // sibling
          stage.props.parent?.id() === base.props.parent?.id()) &&
        stage.props.runtime === base.props.runtime &&
        (!stage.props.materializer ||
          equal(stage.props.materializer, base.props.materializer))
      ) {
        // removing from wait list, no cursor increment
        waitlist.splice(cursor, 1);
        ret.push(
          stage,
          ...Runtime.collectRelativeStages(stage, waitlist, cursor),
        );
      } else {
        cursor += 1;
      }
    }
    return ret;
  }

  static resolveFromParent(name: string): Resolver {
    return ({ _: { parent } }) => {
      const resolver = parent[name];
      return typeof resolver === "function" ? resolver() : resolver;
    };
  }
}
