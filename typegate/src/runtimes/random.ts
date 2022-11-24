// Copyright Metatype under the Elastic License 2.0.

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { TypeNode } from "../type_node.ts";
import Chance from "chance";
// import { ensure } from "../utils.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";

export class RandomRuntime extends Runtime {
  seed: number | null;
  chance: typeof Chance;

  constructor(seed: number | null) {
    super();
    this.seed = seed;
    if (this.seed == null) {
      this.chance = new Chance();
    } else {
      this.chance = new Chance(seed);
    }
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { seed } = params.args as {
      seed: number | null;
    };
    return await new RandomRuntime(seed);
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
      const config = typ.config ?? {};
      if (Object.prototype.hasOwnProperty.call(config, "gen")) {
        const { gen, ...arg } = config;
        return this.chance[gen](arg);
      }

      switch (typ.type) {
        case "object":
          return {};
        case "array":
          // TODO
          return [];
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
        default:
          throw new Error(`type not supported "${typ.type}"`);
      }
    };
  }
}
