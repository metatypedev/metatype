// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegateConfigBase } from "../../config.ts";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { ObjectNode, Type, TypeNode } from "../../typegraph/type_node.ts";
import {
  getChildTypes,
  TypeVisitorMap,
  VisitPath,
  visitTypes,
} from "../../typegraph/visitor.ts";
import { Resolver, ResolverArgs } from "../../types.ts";
import { DenoRuntime } from "../deno/deno.ts";
import { Policy, PolicyIndices } from "../../typegraph/types.ts";
import { getLogger } from "../../log.ts";
import { PolicyResolverOutput } from "../../engine/planner/policies.ts";

export interface FieldToPolicy {
  fieldName: string;
  queueOfPolicyChain: Array<Array<Policy>>;
  typeIdx: number;
  path: VisitPath;
}

export interface WithPath<T extends TypeNode> {
  path: VisitPath;
  node: T;
}

export type AllowOrPass = "ALLOW" | "PASS";
export type LocalFieldTuple = [string, number, AllowOrPass];

interface ResolutionData {
  resolver: Resolver;
  policy: Policy;
}

const logger = getLogger("visibility");

export class TypeVisibility {
  #resolvers: Map<number, ResolutionData>;
  #resolvedPolicy: Map<number, PolicyResolverOutput>;

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly denoRuntime: DenoRuntime,
    private readonly config: TypegateConfigBase,
  ) {
    this.#resolvers = new Map();
    this.#resolvedPolicy = new Map();

    this.reset();
  }

  static getId(indicies: Array<number>) {
    return indicies.join(".");
  }

  reset() {
    this.#resolvers = new Map();
    this.#resolvedPolicy = new Map();
    this.#visitTypegraph();
  }

  #visitTypegraph() {
    // root
    this.#collectPolicyMetadata(0);

    // child
    const myVisitor: TypeVisitorMap = {
      default: ({ idx }) => {
        this.#collectPolicyMetadata(idx);
        return true;
      },
    };
    visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);
  }

  #collectPolicyMetadata(targetTypeIdx: number) {
    const node = this.tg.types[targetTypeIdx];
    if (node.type == Type.OBJECT) {
      const policyIndices = Object.values(node.policies ?? {}).flat();

      const allIndices = policyIndices.map(flattenRegardlessOfEffects).flat();

      for (const policyIdx of allIndices) {
        this.#allocateResolver(policyIdx);
      }
    }
  }

  #allocateResolver(
    policyIdx: number,
  ) {
    if (this.#resolvers.has(policyIdx)) {
      return;
    }

    const policy = this.tg.policies[policyIdx];
    const mat = this.tg.materializers[policy.materializer];
    const resolver = this.denoRuntime.delegate(
      mat,
      false,
      this.config.timer_policy_eval_retries,
    );

    this.#resolvers.set(policyIdx, {
      policy,
      resolver,
    });
  }

  async preComputeAllPolicies(resArg: ResolverArgs<Record<string, any>>) {
    if (this.#resolvedPolicy.size > 0) {
      // logger.debug("Policies already pre-computed");
      return;
    }

    for (const [policyIdx, { policy, resolver }] of this.#resolvers) {
      if (this.#resolvedPolicy.has(policyIdx)) {
        continue;
      }

      const result = await resolver(resArg);
      const validOutput = ["DENY", "ALLOW", "PASS"] satisfies Array<
        PolicyResolverOutput
      >;
      logger.debug(
        `Precomputed ${this.tg.policies[policyIdx].name}: ${result}`,
      );
      if (validOutput.includes(result)) {
        this.#resolvedPolicy.set(policyIdx, result);
      } else {
        throw new Error(
          `Policy "${policy.name}" returned a value of type ${typeof result}, one of ${
            validOutput.join(", ")
          } expected`,
        );
      }
    }
  }

  // Applies the compose rule for chains
  composeChain(operands: Array<PolicyResolverOutput>): PolicyResolverOutput {
    let allowCount = 0;
    for (const operand of operands) {
      if (operand == "PASS") {
        continue;
      }

      const isAllowed = operand == "ALLOW";
      if (!isAllowed) {
        return "DENY";
      } else {
        allowCount += 1;
      }
    }

    return allowCount > 0 ? "ALLOW" : "PASS";
  }

  filterAllowedFields(
    node: ObjectNode,
    parentVerdict?: AllowOrPass,
  ): Array<LocalFieldTuple> {
    const policies = Object.entries(node.policies ?? {});
    const result = [] as Array<LocalFieldTuple>;
    if (parentVerdict == "ALLOW") {
      return Object.entries(node.properties).map(([k, idx]) => {
        return [k, idx, "ALLOW"] satisfies LocalFieldTuple;
      });
    }

    for (const [fieldName, policyChain] of policies) {
      const chainIndices = policyChain.map(flattenRegardlessOfEffects);

      const fieldStatus = chainIndices.map((operand) => {
        const operandRes = operand.map((policyIdx) => {
          const res = this.#resolvedPolicy.get(policyIdx);
          if (res === undefined) {
            throw new Error(
              `Invalid state: policy "${
                this.tg.policies[policyIdx].name
              }" not computed`,
            );
          }
          return res;
        });

        if (operandRes.some((out) => out == "ALLOW")) {
          return "ALLOW";
        } else if (operandRes.every((out) => out == "DENY")) {
          return "DENY";
        }

        return "PASS";
      });

      // Chain compose rule
      const folded = this.composeChain(fieldStatus);
      // logger.debug(`Field ${fieldName}: ${folded}`);
      if (folded != "DENY") {
        result.push(
          [
            fieldName,
            node.properties[fieldName],
            folded as AllowOrPass,
          ] satisfies LocalFieldTuple,
        );
      }
    }

    return result;
  }
}

function flattenRegardlessOfEffects(value: PolicyIndices) {
  if (typeof value == "number") {
    return [value];
  }
  return [value.create, value.delete, value.read, value.update].filter((
    idx,
  ) => idx !== undefined && idx !== null);
}
