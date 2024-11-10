// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import type { FunctionNode, TypeNode } from "../typegraph/type_node.ts";
import Chance from "chance";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import type { RandomRuntimeData } from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";
import { TypeGraphDS } from "../typegraph/mod.ts";

@registerRuntime("random")
export class RandomRuntime extends Runtime {
  seed: number | null;
  chance: typeof Chance;

  constructor(
    typegraphName: string,
    seed: number | null,
    private tg: TypeGraphDS,
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
    const { args, typegraphName, typegraph: tg } = params as RuntimeInitParams<
      RandomRuntimeData
    >;
    const { seed } = args;
    const runtime = await new RandomRuntime(typegraphName, seed ?? null, tg);
    return runtime;
  }

  private getTgTypeNameByIndex(index: number) {
    return this.tg.types[index];
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    return Runtime.materializeDefault(stage, waitlist, (s) => {
      const genNode = (this.tg.types[s.props.typeIdx] as FunctionNode)
        .runtimeConfig as GeneratorNode | null;
      return [s.withResolver(this.execute(s.props.outType, genNode))];
    });
  }

  execute(typ: TypeNode, genNode: GeneratorNode | null): Resolver {
    return () => {
      return randomizeRecursively(typ, this.chance, this.tg.types, genNode);
    };
  }
}

export type GeneratorNode =
  | { children: Record<string, GeneratorNode> }
  | { gen: string; args: Record<string, unknown> };

export default function randomizeRecursively(
  typ: TypeNode,
  chance: typeof Chance,
  tgTypes: TypeNode[],
  generatorNode: GeneratorNode | null,
): any {
  if (generatorNode && ("gen" in generatorNode)) {
    const { gen, args } = generatorNode;
    const res = chance[gen as string](args);
    return res;
  }
  switch (typ.type) {
    case "object": {
      const result: Record<string, any> = {};
      for (const [field, idx] of Object.entries(typ.properties)) {
        const genNode = generatorNode && ("children" in generatorNode) &&
            generatorNode.children[field] || null;
        const nextNode = tgTypes[idx];
        result[field] = randomizeRecursively(
          nextNode,
          chance,
          tgTypes,
          genNode,
        );
      }
      return result;
    }
    case "optional": {
      const childNodeName = tgTypes[typ.item];
      const genNode = generatorNode && ("children" in generatorNode) &&
          generatorNode.children["_"] || null;
      return chance.bool()
        ? randomizeRecursively(childNodeName, chance, tgTypes, genNode)
        : null;
    }
    case "integer":
      if (typ.enum) {
        return chance.pickone(typ.enum.map((x) => parseInt(x)));
      }
      return chance.integer();
    case "float":
      if (typ.enum) {
        return chance.pickone(typ.enum.map((x) => parseFloat(x)));
      }
      return chance.floating();
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
        const randomDate = chance.date();

        // Get the timestamp of the random date
        const timestamp = randomDate.getTime();

        // Create a new Date object with the timestamp adjusted for the local timezone offset
        const dateInUtc = new Date(
          timestamp - randomDate.getTimezoneOffset() * 60000,
        );
        return dateInUtc.toISOString();
      }
      if (typ.format === "phone") {
        return chance.phone();
      }
      if (typ.format == "ean") {
        return generateEAN(chance);
      }
      if (typ.enum) {
        // remove extra " from the string
        return JSON.parse(chance.pickone(typ.enum));
      }
      return chance.string();
    case "boolean":
      return chance.bool();
    case "list": {
      const res = [];
      let size = chance.integer({ min: 1, max: 10 });
      const childNodeName = tgTypes[typ.items];
      const genNode = generatorNode && ("children" in generatorNode) &&
          generatorNode.children["_"] || null;
      while (size--) {
        res.push(
          randomizeRecursively(childNodeName, chance, tgTypes, genNode),
        );
      }
      return res;
    }
    case "either": {
      const variant = chance.integer({ min: 0, max: typ.oneOf.length - 1 });
      const genNode = generatorNode && ("children" in generatorNode) &&
          generatorNode.children[`_${variant}`] || null;
      const result = randomizeRecursively(
        tgTypes[typ.oneOf[variant]],
        chance,
        tgTypes,
        genNode,
      );
      return result;
    }
    case "union": {
      const variant = chance.integer({ min: 0, max: typ.anyOf.length - 1 });
      const genNode = generatorNode && ("children" in generatorNode) &&
          generatorNode.children[`_${variant}`] || null;
      const result = randomizeRecursively(
        tgTypes[typ.anyOf[variant]],
        chance,
        tgTypes,
        genNode,
      );
      return result;
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
