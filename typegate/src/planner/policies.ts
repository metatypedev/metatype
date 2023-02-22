// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { DenoRuntime } from "../runtimes/deno.ts";
import { TypeGraph } from "../typegraph.ts";
import { Context, PolicyIdx, PolicyList, Resolver, TypeIdx } from "../types.ts";
import { Effect, EffectType } from "../types/typegraph.ts";
import { Type } from "../type_node.ts";
import { ensure } from "../utils.ts";
import { Node, Tree } from "./utils.ts";
import { mapValues } from "std/collections/map_values.ts";

type StagePolicies = Map<TypeIdx, PolicyList>;
interface TreeNodeValue {
  policies: StagePolicies;
  effect: Effect | null;
}

export class OperationPolicies {
  private policyTree: Tree<TreeNodeValue, string>;
  private resolvers: Map<PolicyIdx, Record<EffectType | "none", Resolver>>;

  constructor(
    private tg: TypeGraph,
    referencedTypes: Tree<TypeIdx[], string>,
  ) {
    const policies = new Set<PolicyIdx>();

    this.policyTree = referencedTypes.map((types) => {
      const policyLists = new Map<TypeIdx, PolicyList>();
      for (const typeIdx of types) {
        const type = this.tg.type(typeIdx);
        const policyList = type.policies;
        if (policyList.length > 0) {
          policyLists.set(typeIdx, policyList);
          policyList.forEach((idx) => policies.add(idx));
        }
      }

      const firstType = this.tg.type(types[0]);
      const effect = firstType.type === Type.FUNCTION
        ? this.tg.materializer(firstType.materializer).effect
        : null;
      return {
        policies: policyLists,
        effect,
      };
    });

    OperationPolicies.propagateEffect(this.policyTree.root);

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

      const materializers = {
        none: this.tg.policyMaterializer(policy),
        update: this.tg.policyMaterializer(policy, "update"),
        upsert: this.tg.policyMaterializer(policy, "upsert"),
        create: this.tg.policyMaterializer(policy, "create"),
        delete: this.tg.policyMaterializer(policy, "delete"),
      };
      this.resolvers.set(
        idx,
        mapValues(
          materializers,
          (mat) => (args) => runtime.delegate(mat, false)(args),
        ),
      );
    }
  }

  static propagateEffect(node: Node<TreeNodeValue, string>) {
    const eff = node.value.effect;
    for (const n of node.subtrees.values()) {
      if (n.value.effect == null) {
        n.value.effect = eff;
      }
      OperationPolicies.propagateEffect(n);
    }
  }

  public async authorize(context: Context, args: Record<string, unknown>) {
    // TODO
    const _authorizedTypes = new Set<TypeIdx>();

    const cache = new Map<
      PolicyIdx,
      Partial<Record<EffectType | "none", boolean | null>>
    >();

    const getResolverResult = async (
      idx: PolicyIdx,
      effect: EffectType | "none",
    ): Promise<boolean | null> => {
      console.debug(
        `checking policy '${
          this.tg.policy(idx).name
        }'[${idx}]; effect=${effect}`,
      );
      if (!cache.has(idx)) {
        cache.set(idx, {});
      }
      const entries = cache.get(idx)!;
      if (effect in entries) {
        // return Promise.resolve(entries[effect] as boolean | null);
        return entries[effect] as boolean | null;
      }

      const resolver = this.resolvers.get(idx)![effect];
      ensure(
        resolver != null,
        `Could not find resolver for the policy '${
          this.tg.policy(idx).name
        }'; effect=${effect}`,
      );
      const res = await resolver!({
        ...args,
        _: {
          parent: {},
          context,
          variables: {},
          effect: effect === "none" ? null : effect,
        },
      }) as boolean | null;
      entries[effect] = res;
      return res;
    };

    for (const [path, { policies, effect }] of this.policyTree.entries()) {
      if (effect == null) {
        // propagate effect should have set effect for all the nodes except for namespaces
        continue;
      }
      // cache authorized types -- prevent multiple evaluations
      for (const [typeIdx, policyList] of policies) {
        for (const idx of policyList) {
          const res = await getResolverResult(idx, effect.effect ?? "none");
          if (res == null) {
            continue;
          }

          if (res) {
            break; // authorized
          }

          const policyName = this.tg.policy(idx).name;
          const typeName = this.tg.type(typeIdx).title;
          const details = [
            `policy '${policyName}'`,
            `with effect '${effect.effect ?? "none"}'`,
            `on type '${typeName}'`,
            `at '${["<root>", ...path].join(".")}'`,
          ].join(" ");
          throw new Error(
            `Authorization failed for ${details}`,
          );
        }
      }
      //
    }
  }

  public ensureTypeHasPolicies(path: string[], typeIdx: TypeIdx) {
    if (this.policyTree.getNode(path).value.policies.get(typeIdx) == null) {
      throw new Error(
        "No authorization policy took a decision in top-level function at '${stageId}'",
      );
    }
  }
}
