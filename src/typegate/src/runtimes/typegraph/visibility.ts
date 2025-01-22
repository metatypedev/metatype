// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegateConfigBase } from "../../config.ts";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { Type } from "../../typegraph/type_node.ts";
import {
  getChildTypes,
  TypeVisitorMap,
  VisitPath,
  visitTypes,
} from "../../typegraph/visitor.ts";
import { Resolver, ResolverArgs } from "../../types.ts";
import { DenoRuntime } from "../deno/deno.ts";
import { Policy } from "../../typegraph/types.ts";

export interface FieldToPolicy {
  fieldName: string;
  policies: Array<Policy>;
  typeIdx: number;
  path: VisitPath;
}

interface ResolutionData {
  resolver: Resolver;
  fieldPolicyData: FieldToPolicy;
  targetTypeIdx: number;
  policyNameAtTargetTypeIdx: string;
}

export class TypeVisibility {
  pathToIdx: Map<string, number>;
  #resolvers: Map<string, ResolutionData>;
  #typeAllowCounters: Map<number, { referrers: number; deniers: number }>;

  #idToAllow: Map<string, boolean>;
  #typeIdxToIds: Map<number, Set<string>>;

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly denoRuntime: DenoRuntime,
    private readonly config: TypegateConfigBase,
  ) {
    this.pathToIdx = new Map();
    this.#resolvers = new Map();
    this.#typeAllowCounters = new Map();
    this.#typeIdxToIds = new Map();
    this.#idToAllow = new Map();

    this.#visitTypegraph();
  }

  static getId(indicies: Array<number>) {
    return indicies.join(".");
  }

  #visitTypegraph() {
    const myVisitor: TypeVisitorMap = {
      default: ({ idx, path }) => {
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
          policies: allIndices.flat().map((polIdx) => this.tg.policies[polIdx]),
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
    console.log("Queue", queue);
    for (const fieldToPolicy of queue) {
      for (const policy of fieldToPolicy.policies) {
        const mat = this.tg.materializers[policy.materializer];

        const resolver = this.denoRuntime.delegate(
          mat,
          false,
          this.config.timer_policy_eval_retries,
        );
        this.#resolvers.set(qId, {
          resolver,
          fieldPolicyData: fieldToPolicy,
          targetTypeIdx,
          policyNameAtTargetTypeIdx: policy.name,
        });
      }
    }

    return true;
  }

  async computeAllowList(resArgs: ResolverArgs<Record<string, any>>) {
    for (const [qid, resData] of this.#resolvers) {
      const { fieldPolicyData, resolver, policyNameAtTargetTypeIdx, targetTypeIdx } = resData;
      const cached = this.#idToAllow.get(qid);
      const result = cached === undefined ? await resolver(resArgs) : cached;

      if (result == "PASS") {
        continue;
      } else if (result == "ALLOW" || result == "DENY") {
        const ret = result == "ALLOW";
        this.#idToAllow.set(qid, ret);
        if (this.#typeIdxToIds.has(targetTypeIdx)) {
          this.#typeIdxToIds.get(targetTypeIdx)!.add(qid);
        } else {
          this.#typeIdxToIds.set(targetTypeIdx, new Set([qid]));
        }

        return ret;
      } else {
        const path = fieldPolicyData.path.edges.join(".");
        throw new Error(
          `Unexpected value of type ${typeof result} for policy "${policyNameAtTargetTypeIdx}" at '${path}', for policy, must be "PASS", "ALLOW", or "DENY"`,
        );
      }
    }

    // TODO:
    // 1. evaluate the resolver queue from left to right
    // 2. increase deniers count for the underlying typeIdx if DENY
    // 3. types field on the introspection is a flat list
    // yet the input objects should be cared for separately (custom visitor maybe? + construct the path and get the id)
    // 4. special care for union/either

    return true;
  }

  isVisible(typeIdx: number) {
    if (this.#typeAllowCounters.has(typeIdx)) {
      const data = this.#typeAllowCounters.get(typeIdx)!;
      const refThatAllows = data.referrers - data.deniers;
      return refThatAllows > 0;
    }

    throw new Error("Invalid state: type metadata not collected properly");
  }

  filterVisible(indices: Set<number>) {
    const visible = [];
    for (const index of indices) {
      if (this.isVisible(index)) {
        visible.push(index);
      }
    }

    return visible;
  }
}
