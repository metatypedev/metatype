// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { DenoRuntime } from "../runtimes/deno.ts";
import { TypeGraph } from "../typegraph.ts";
import {
  Context,
  PolicyIdx,
  PolicyList,
  Resolver,
  StageId,
  TypeIdx,
} from "../types.ts";
import { ensure } from "../utils.ts";

export class OperationPolicies {
  private policyLists: Map<StageId, Map<TypeIdx, PolicyList>>;
  private resolvers: Map<PolicyIdx, Resolver>;

  constructor(
    private tg: TypeGraph,
    referencedTypes: Map<StageId, TypeIdx[]>,
  ) {
    //
    this.policyLists = new Map();
    const policies = new Set<PolicyIdx>();

    for (const [stageId, types] of referencedTypes) {
      const policyLists = new Map<TypeIdx, PolicyList>();
      for (const typeIdx of types) {
        const type = this.tg.type(typeIdx);
        const policyList = type.policies;
        if (policyList.length > 0) {
          policyLists.set(typeIdx, policyList);
          policyList.forEach((idx) => policies.add(idx));
        }
      }
      if (policyLists.size > 0) {
        this.policyLists.set(stageId, policyLists);
      }
    }

    this.resolvers = new Map();
    for (const idx of policies) {
      if (this.tg.introspection) {
        // TODO
        // throw new Error("TODO: not supported yet");
      }

      const policy = this.tg.policy(idx);
      const mat = this.tg.policyMaterializer(policy);
      const runtime = this.tg.runtimeReferences[mat.runtime] as DenoRuntime;
      ensure(
        runtime.constructor === DenoRuntime,
        "Policies must run on a Deno Runtime",
      );

      this.resolvers.set(idx, runtime.delegate(mat, false));
    }
  }

  public async authorize(context: Context, args: Record<string, unknown>) {
    const authorizedTypes = new Set<TypeIdx>();
    const cache = new Map<PolicyIdx, boolean | null>();

    const getResolverResult = (
      idx: PolicyIdx,
    ): Promise<boolean | null> => {
      if (cache.has(idx)) {
        return Promise.resolve(cache.get(idx) as boolean | null);
      }

      const resolver = this.resolvers.get(idx);
      ensure(
        resolver != null,
        `Could not find resolver for the policy '${this.tg.policy(idx).name}'`,
      );
      return resolver!({
        ...args,
        _: {
          parent: {},
          context,
          variables: {},
        },
      }) as Promise<boolean | null>;
    };

    for (const [stageId, policyLists] of this.policyLists) {
      for (const [typeIdx, policyList] of policyLists) {
        if (authorizedTypes.has(typeIdx)) {
          continue;
        }
        authorizedTypes.add(typeIdx);

        for (const idx of policyList) {
          const res = await getResolverResult(idx);
          if (res == null) {
            continue;
          }

          if (!res) {
            // res === false
            const policyName = this.tg.policy(idx).name;
            const typeName = this.tg.type(typeIdx).title;
            throw new Error(
              `Authorization failed for policy '${policyName}' on '${typeName}' at '${stageId}'`,
            );
          }

          // res === true
          break;
        }
      }
    }
  }
}
