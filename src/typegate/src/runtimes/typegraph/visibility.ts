// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegateConfigBase } from "../../config.ts";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { Type, TypeNode } from "../../typegraph/type_node.ts";
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
  fieldPolicyData: FieldToPolicy;
  targetTypeIdx: number;
  policyNameAtTargetTypeIdx: string;
}

const logger = getLogger("visibility");

export class TypeVisibility {
  pathToIdx: Map<string, number>;
 // Note: value has same dim as the queue of policy chain to evaluate
  #resolvers: Map<string, Array<Array<ResolutionData>>>;
  #typeAllowCounters: Map<number, { referrers: number; deniers: number }>;

  #idToAllow: Map<string, boolean | null>;
  #idxPaths: Map<number, Array<VisitPath>>;

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly denoRuntime: DenoRuntime,
    private readonly config: TypegateConfigBase,
  ) {
    this.pathToIdx = new Map();
    this.#resolvers = new Map();
    this.#typeAllowCounters = new Map();
    this.#idxPaths = new Map();
    this.#idToAllow = new Map();

    this.#visitTypegraph();
  }

  static getId(indicies: Array<number>) {
    return indicies.join(".");
  }

  #visitTypegraph() {
    const myVisitor: TypeVisitorMap = {
      default: ({ idx, path }) => {
        if (!this.#idxPaths.has(idx)) {
          this.#idxPaths.set(idx, []);
        }
        this.#idxPaths.get(idx)!.push(path);

        if (this.#typeAllowCounters.has(idx)) {
          this.#typeAllowCounters.get(idx)!.referrers++;
        } else {
          this.#typeAllowCounters.set(idx, {
            referrers: 1,
            deniers: 0,
          });
        }

        this.#collectPolicyMetadata(path, idx);
        return true;
      },
    };
    visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);
  }

  #collectPolicyMetadata(path: VisitPath, targetTypeIdx: number) {
    const policiesQueue = [] as Array<FieldToPolicy>;
    // Note: last item on path indices is the current type
    if (path.edges.length + 1 != path.indices.length) {
      throw new Error("Invalid state: visited path metadata not in sync");
    }

    for (let i = 0; i < path.edges.length; i++) {
      const currTypeIdx = path.indices[i];
      const fieldName = path.edges[i];
      const node = this.tg.types[currTypeIdx];
      if (node.type == Type.OBJECT && node.policies?.[fieldName]) {
        const policyIndices = node.policies[fieldName];
        const allIndices = policyIndices.map((value) => {
          if (typeof value == "number") {
            return [value];
          }

          return [value.create, value.delete, value.read, value.update].filter((
            idx,
          ) => idx !== undefined && idx !== null);
        });

        policiesQueue.push({
          fieldName,
          queueOfPolicyChain: allIndices.map((chainIndicies) => {
            return chainIndicies.map((polIdx) => this.tg.policies[polIdx]) 
          }),
          typeIdx: currTypeIdx,
          path,
        });
      }
    }

    this.allocateResolvers(
      TypeVisibility.getId(path.indices),
      policiesQueue,
      targetTypeIdx,
    );
  }

  allocateResolvers(
    qId: string,
    queue: Array<FieldToPolicy>,
    targetTypeIdx: number,
  ) {
    for (const fieldToPolicy of queue) {
      for (const polChain of fieldToPolicy.queueOfPolicyChain) {
        const currChainResData = polChain.map((policy) => {
          const mat = this.tg.materializers[policy.materializer];
          const resolver = this.denoRuntime.delegate(
            mat,
            false,
            this.config.timer_policy_eval_retries,
          );
          return {
            resolver,
            fieldPolicyData: fieldToPolicy,
            targetTypeIdx,
            policyNameAtTargetTypeIdx: policy.name,
          };
        });

        if (!this.#resolvers.has(qId)) {
          this.#resolvers.set(qId, []);
        }

        this.#resolvers.get(qId)!.push(currChainResData);
      }
    }
  }

  /**
   * Compose policies at a given node
   * 
   * If one policy on the chain, regardless of the effect is allowed, the underlying type is visible
   */
  async #composePolicies(resArgs: ResolverArgs<Record<string, any>>, operands: Array<ResolutionData>) {
    let verdict = null;

    for (const { resolver, fieldPolicyData, policyNameAtTargetTypeIdx, targetTypeIdx} of operands) {
      const result = await resolver(resArgs);
      if (result == "PASS") {
        continue;
      } else if (result == "ALLOw") {
        verdict = true;
      } else if (result == "DENY") {
        this.#typeAllowCounters.get(targetTypeIdx)!.deniers++;
        if (verdict) {
          continue;
        }

        verdict = false;
      } else {
        const path = fieldPolicyData.path.edges.join(".");
        throw new Error(
          `Unexpected value of type ${typeof result} for policy "${policyNameAtTargetTypeIdx}" at '${path}', for policy, must be "PASS", "ALLOW", or "DENY"`,
        );
      }
    }

    return verdict;
  }

  async #computeQueue(resArgs: ResolverArgs<Record<string, any>>, queueOfChains: Array<Array<ResolutionData>>) {
    // This basically emulates node traversal,
    // collect the policy chain at each node,
    // then apply the pol spec logic but tunned for visibility, and ignores effects
    for (const chainRes of queueOfChains) {
      const result = await this.#composePolicies(resArgs, chainRes);
      if (result === null) {
        // no policies or PASS at the current node
        continue;
      }

      // No need to go further, ALLOW and DENY are absolute
      return result;
    }

    return null;
  }

  async computeAllowList(resArgs: ResolverArgs<Record<string, any>>) {
    for (const [qid, resQueue] of this.#resolvers) {
      const cached = this.#idToAllow.get(qid);
      if (cached !== undefined) {
        return cached;
      }

      const verdict = await this.#computeQueue(resArgs, resQueue);
      this.#idToAllow.set(qid, verdict);
    }

    logger.debug("Allowed typeIdx info: " +  Deno.inspect(this.#idToAllow));
    logger.debug("Index referrers info: " +  Deno.inspect(this.#idxPaths));
    // TODO:
    // 2. increase deniers count for the underlying typeIdx if DENY
    // 3. types field on the introspection is a flat list
    // yet the input objects should be cared for separately (custom visitor maybe? + construct the path and get the id)
    // 4. special care for union/either
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

  isVisible(path: VisitPath) {
    const qid = TypeVisibility.getId(path.indices);
    const verdict = this.#idToAllow.get(qid);
    if (typeof verdict == "boolean") {
      console.log("BAD", qid);
      return verdict;
    }

    return true;
  }
}
