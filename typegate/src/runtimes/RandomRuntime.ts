import { Resolver, Runtime, RuntimeInitParams } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { TypeNode } from "../typegraph.ts";
import Chance from "https://cdn.skypack.dev/chance?dts";

export class RandomRuntime extends Runtime {
  seed: number | null;
  chance: Chance;

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
    verbose: boolean,
  ): ComputeStage[] {
    const stagesMat: ComputeStage[] = [];

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    stagesMat.push(
      new ComputeStage({
        ...stage.props,
        resolver: this.execute(stage.props.outType),
        batcher: (x: any) => x, // WHAT?,
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
    return ({ _: { parent } }) => {
      switch (typ.typedef) {
        case "struct":
          return {};
        case "list":
          return [];
        case "integer":
          return this.chance.integer();
        case "unsigned_integer": {
          let n = this.chance.integer();
          while (n < 0) {
            n = this.chance.integer();
          }
          return n;
        }
        case "uuid":
          return this.chance.guid();
        case "string":
          return this.chance.string();
        case "email":
          return this.chance.email();
        case "char":
          return this.chance.character();
        case "boolean":
          return this.chance.bool();
        default:
          throw new Error(`type not supported "${typ.typedef}"`);
      }
    };
  }
}
