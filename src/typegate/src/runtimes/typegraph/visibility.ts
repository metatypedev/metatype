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

  filterAllowedFields(node: ObjectNode): Array<[string, number]> {
    const policies = Object.entries(node.policies ?? {});
    const result = [] as Array<[string, number]>;

    for (const [fieldName, policyChain] of policies) {
     const flatChain = policyChain.map((value) => {
      if (typeof value == "number") {
        return [value];
      }
    
      return [value.create, value.delete, value.read, value.update].filter((
        idx,
      ) => idx !== undefined && idx !== null);
     })
     .flat();

     let allow = true;
     for (const policyIdx of flatChain) {
      const verdict = this.#resolvedPolicy.get(policyIdx);
      if (verdict === undefined) {
        throw new Error(`Invalid state: policy "${this.tg.policies[policyIdx].name}" not computed`);
      }

      if (verdict == "DENY") {
        allow = false;
        break;
      }
     }

     if (allow) {
      result.push([fieldName, node.properties[fieldName]])
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
