// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeNode } from "../typegraph/type_node.ts";
import Chance from "chance";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { RandomRuntimeData } from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";

@registerRuntime("random")
export class RandomRuntime extends Runtime {
  seed: number | null;
  chance: typeof Chance;
  private _tgTypes: TypeNode[] = [];

  constructor(
    typegraphName: string,
    seed: number | null,
  ) {
    super(typegraphName);
    this.seed = seed;
    if (this.seed == null) {
      this.chance = new Chance();
    } else {
      this.chance = new Chance(seed);
    }
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { args, typegraphName } = params as RuntimeInitParams<
      RandomRuntimeData
    >;
    const { seed } = args;
    const runtime = await new RandomRuntime(typegraphName, seed ?? null);
    runtime.setTgTypes(params.typegraph.types);
    return runtime;
  }

  private setTgTypes(tg_types: TypeNode[]) {
    this._tgTypes = tg_types;
  }

  private getTgTypeNameByIndex(index: number) {
    return this._tgTypes[index];
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    stagesMat.push(
      new ComputeStage({
        ...stage.props,
        resolver: this.execute(stage.props.outType),
        batcher: (x: any) => x,
      }),
    );

    stagesMat.push(...sameRuntime.map((stage) =>
      new ComputeStage({
        ...stage.props,
        dependencies: [...stage.props.dependencies, stagesMat[0].id()],
        resolver: this.execute(stage.props.outType),
      })
    ));

    return stagesMat;
  }

  execute(typ: TypeNode): Resolver {
    return () => {
      return this.randomizeRecursively(typ);
    };
  }

  randomizeRecursively(typ: TypeNode): any {
    const config = typ.config ?? {};
    if (Object.prototype.hasOwnProperty.call(config, "gen")) {
      const { gen, ...arg } = config;
      return this.chance[gen as string](arg);
    }
    switch (typ.type) {
      case "object":
        return {};
      case "optional": {
        const childNodeName = this.getTgTypeNameByIndex(typ.item);
        return this.chance.bool()
          ? this.randomizeRecursively(childNodeName)
          : null;
      }
      case "integer":
        return this.chance.integer();
      case "string":
        if (typ.format === "uuid") {
          return this.chance.guid();
        }
        if (typ.format === "email") {
          return this.chance.email();
        }
        return this.chance.string();
      case "boolean":
        return this.chance.bool();
      case "array": {
        const res = [];
        let size = this.chance.integer({ min: 1, max: 10 });
        const childNodeName = this.getTgTypeNameByIndex(typ.items);
        while (size--) {
          res.push(this.randomizeRecursively(childNodeName));
        }
        return res;
      }
      default:
        throw new Error(`type not supported "${typ.type}"`);
    }
  }
}
