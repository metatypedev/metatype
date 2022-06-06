import { ComputeStage } from "../engine.ts";
import type { TypeGraphDS, TypeMaterializer } from "../typegraph.ts";
import { equal } from "std/testing/asserts.ts";

export type Resolver = (args: any) => Promise<any> | any;

export type Batcher = (x: any) => any;

export type RuntimeConfig = Record<string, unknown>;
export type RuntimesConfig = Record<string, RuntimeConfig>;

export type RuntimeInit = Record<
  string,
  (
    typegraph: TypeGraphDS,
    materializers: TypeMaterializer[],
    args: Record<string, unknown>,
    config: RuntimeConfig
  ) => Promise<Runtime>
>;

export abstract class Runtime {
  abstract deinit(): Promise<void>;

  abstract materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    verbose: boolean
  ): ComputeStage[];

  static collectRelativeStages(
    base: ComputeStage,
    waitlist: ComputeStage[],
    cursor = 0
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
          ...Runtime.collectRelativeStages(stage, waitlist, cursor)
        );
      } else {
        cursor += 1;
      }
    }
    return ret;
  }
}
