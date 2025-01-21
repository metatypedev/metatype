// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { TypegateConfigBase } from "../../config.ts";
import { TypeGraphDS } from "../../typegraph/mod.ts";
import { Type } from "../../typegraph/type_node.ts";
import { getChildTypes, TypeVisitorMap, VisitPath, visitTypes } from "../../typegraph/visitor.ts";
import { Context, Resolver } from "../../types.ts";
import { DenoRuntime } from "../deno/deno.ts";

export interface FieldToPolicy {
  fieldName: string;
  policies: Array<number>;
};

export class TypeVisibility {
  pathToIdx: Map<string, number>;
  #resolvers: Map<string, Resolver>;
  #typeAllowCounters: Map<number, { referrers: number, deniers: number }>;

  constructor(
    private readonly tg: TypeGraphDS,
    private readonly denoRuntime: DenoRuntime,
    private readonly config: TypegateConfigBase
    ) {
    this.pathToIdx = new Map();
    this.#resolvers = new Map();
    this.#typeAllowCounters = new Map();

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
            deniers: 0
          });
        }

        this.#collectPolicyMetadata(path, idx);
        return true;
      }
    };
    visitTypes(this.tg, getChildTypes(this.tg.types[0]), myVisitor);
  }

  #collectPolicyMetadata(path: VisitPath, typeIdx: number) {
    const policiesQueue = [] as Array<FieldToPolicy>;
    // Note: last item on path indices is the current type
    if (path.edges.length + 1 != path.indices.length) {
      throw new Error("Invalid state: visited path metadata not in sync");
    }

    for (let i = 0; i < path.edges.length; i++) {
      const typeIdx = path.indices[i];
      const fieldName = path.edges[i];
      const node = this.tg.types[typeIdx];
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
          policies: allIndices.flat(),
        });
      }
    }

    this.allocateResolvers(
      TypeVisibility.getId(path.indices),
      policiesQueue,
      typeIdx
    );
  }

  allocateResolvers(qId: string, queue: Array<FieldToPolicy>, typeIdx: number) {
    console.log("Queue", queue);
    for (const { fieldName: _, policies } of queue) {
      for (const polIdx of policies) {
        const policy = this.tg.policies[polIdx];
        const mat = this.tg.materializers[policy.materializer];
        
        const resolver = this.denoRuntime.delegate(mat, false, this.config.timer_policy_eval_retries);
        this.#resolvers.set(qId, resolver);
      }
    }

    return true;
  }

  async computeAllowList(context: Context) {
    // TODO:
    // 1. evaluate the resolver queue from left to right
    // 2. increase deniers count for the underlying typeIdx if DENY
    // 3. types field on the introspection is a flat list
    // yet the input objects should be cared for separately (custom visitor maybe? + construct the path and get the id)
    // 4. special care for union/either 
    await Promise.resolve("todo"); 
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
