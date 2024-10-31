// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ComputeStage } from "../engine/query_engine.ts";
import { equal } from "@std/assert/equal";
import type { Resolver, ResolverArgs } from "../types.ts";

export abstract class Runtime {
  readonly id: string;

  constructor(
    public typegraphName: string,
    uuid = crypto.randomUUID() as string,
  ) {
    this.id = `${typegraphName}_${this.constructor.name}_${uuid}`;
  }

  abstract deinit(): Promise<void>;

  abstract materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean,
  ): ComputeStage[] | Promise<ComputeStage[]>;

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

  static materializeDefault(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    materializeRoot: (stage: ComputeStage) => ComputeStage[],
  ): ComputeStage[] {
    const materializedStages: ComputeStage[] = [];
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);
    for (const s of [stage, ...sameRuntime]) {
      if (s.props.materializer) {
        materializedStages.push(...materializeRoot(s));
      } else {
        materializedStages.push(
          s.withResolver(
            Runtime.resolveFromParent(s.props.node),
            [s.props.parent!.id()],
          ),
        );
      }
    }

    return materializedStages;
  }

  static resolveFromParent(name: string): Resolver {
    return ({ _: { parent } }) => {
      const resolver = parent[name];
      return (typeof resolver === "function" ? resolver() : resolver) ?? null;
    };
  }
}
