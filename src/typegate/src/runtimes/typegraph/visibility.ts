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
import { Policy } from "../../typegraph/types.ts";
import { getLogger } from "../../log.ts";
import { PolicyResolverOutput } from "../../engine/planner/policies.ts";
import { extractExceptionKeysForMessage } from "../../../../../../../../../home/afmika/.cache/deno/npm/registry.npmjs.org/@sentry/utils/7.70.0/types/object.d.ts";

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

interface ResolutionData {
  resolver: Resolver;
  policy: Policy
}

const logger = getLogger("visibility");

export class TypeVisibility {
  #resolvers: Map<number, ResolutionData>;
  #resolvedPolicy: Map<number, PolicyResolverOutput>;
  #typeAllowCounters: Map<number, { referrers: number; deniers: number }>;

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly denoRuntime: DenoRuntime,
    private readonly config: TypegateConfigBase,
  ) {
    this.#resolvers = new Map();
    this.#typeAllowCounters = new Map();
    this.#resolvedPolicy = new Map();

    this.#visitTypegraph();
  }

  static getId(indicies: Array<number>) {
    return indicies.join(".");
  }

  #visitTypegraph() {
    const myVisitor: TypeVisitorMap = {
      default: ({ idx }) => {
        if (this.#typeAllowCounters.has(idx)) {
          this.#typeAllowCounters.get(idx)!.referrers++;
        } else {
          this.#typeAllowCounters.set(idx, {
            referrers: 1,
            deniers: 0,
          });
        }

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

      const allIndices = policyIndices.map((value) => {
        if (typeof value == "number") {
          return [value];
        }

        return [value.create, value.delete, value.read, value.update].filter((
          idx,
        ) => idx !== undefined && idx !== null);
      }).flat();

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
      resolver
    });
  }

  async preComputeAllPolicies(resArg: ResolverArgs<Record<string, any>>) {
    for (const [policyIdx, { policy, resolver }] of this.#resolvers) {
      const result = await resolver(resArg);
      const validOutput = ["DENY", "ALLOW", "PASS"]  satisfies Array<PolicyResolverOutput>;
      if (validOutput.includes(result)) {
        this.#resolvedPolicy.set(policyIdx, result);
      } else {
        throw new Error(`Policy "${policy.name}" returned a value of type ${typeof result}, one of ${validOutput.join(", ")} expected`);
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
    parentVerdict?: AllowOrPass
  ): Array<[string, number, AllowOrPass]> {
    const policies = Object.entries(node.policies ?? {});
    const result = [] as Array<[string, number, AllowOrPass]>;
    if (parentVerdict == "ALLOW") {
      return Object.entries(node.properties).map((entry) => {
        return  [...entry, "ALLOW"];
      });
    }

    for (const [fieldName, policyChain] of policies) {
     const chainIndices = policyChain.map((value) => {
      if (typeof value == "number") {
        return [value];
      }

      return [value.create, value.delete, value.read, value.update].filter((
        idx,
      ) => idx !== undefined && idx !== null);
     });

     const fieldStatus = chainIndices.map((operand) => {
      const operandRes = operand.map((policyIdx) => {
        const res = this.#resolvedPolicy.get(policyIdx);
        if (res === undefined) {
          throw new Error(`Invalid state: policy "${this.tg.policies[policyIdx].name}" not computed`);
        }
        return res
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
     logger.debug(`Field ${fieldName}: ${folded}`);
     if (folded != "DENY") {
      result.push([fieldName, node.properties[fieldName], folded as AllowOrPass])
     }
    }

    return result;
  }


  isUnreachable(typeIdx: number) {
    if (this.#typeAllowCounters.has(typeIdx)) {
      const data = this.#typeAllowCounters.get(typeIdx)!;
      const refThatAllows = data.referrers - data.deniers;
      console.log("check", typeIdx,refThatAllows > 0 ? "Allow" : "deny");
      return refThatAllows > 0;
    }

    throw new Error("Invalid state: type metadata not collected properly");
  }

  keepReachable(indices: Set<number>, debugInfo?: string) {
    const visible = [];
    for (const index of indices) {
      if (this.isUnreachable(index)) {
        visible.push(index);
      } else if (debugInfo) {
        logger.debug(`visibility check: ${debugInfo}: removed ${index} (${this.tg.types[index].title})`);
      }
    }

    return visible;
  }
}
