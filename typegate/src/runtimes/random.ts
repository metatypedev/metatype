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
      return randomizeRecursively(typ, this.chance, this._tgTypes);
    };
  }
}

export default function randomizeRecursively(
  typ: TypeNode,
  chance: typeof Chance,
  tgTypes: TypeNode[],
): any {
  const config = typ.config ?? {};
  if (Object.prototype.hasOwnProperty.call(config, "gen")) {
    const { gen, ...arg } = config;
    return chance[gen as string](arg);
  }
  switch (typ.type) {
    case "object":
      return {};
    case "optional": {
      const childNodeName = tgTypes[typ.item];
      return chance.bool()
        ? randomizeRecursively(childNodeName, chance, tgTypes)
        : null;
    }
    case "integer":
      return chance.integer();
    case "string":
      if (typ.format === "uuid") {
        return chance.guid();
      }
      if (typ.format === "email") {
        return chance.email();
      }
      if (typ.format === "uri") {
        return chance.url();
      }
      if (typ.format === "hostname") {
        return chance.domain();
      }
      if (typ.format === "date-time") {
        return chance.date().toISOString();
      }
      if (typ.format === "phone") {
        return chance.phone();
      }
      if (typ.format == "ean") {
        return generateEAN(chance);
      }
      return chance.string();
    case "boolean":
      return chance.bool();
    case "list": {
      const res = [];
      let size = chance.integer({ min: 1, max: 10 });
      const childNodeName = tgTypes[typ.items];
      while (size--) {
        res.push(
          randomizeRecursively(childNodeName, chance, tgTypes),
        );
      }
      return res;
    }

    default:
      throw new Error(`type not supported "${typ.type}"`);
  }
}

function generateEAN(chance: typeof Chance) {
  let ean = "0";

  for (let i = 1; i <= 11; i++) {
    ean += chance.integer({ min: 0, max: 9 }).toString();
  }

  const checkDigit = calculateCheckDigit(ean);
  ean += checkDigit;

  return ean;
}

function calculateCheckDigit(ean: string) {
  const digits = ean.split("").map(Number);

  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += (i % 2 === 0) ? digits[i] : digits[i] * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit.toString();
}
