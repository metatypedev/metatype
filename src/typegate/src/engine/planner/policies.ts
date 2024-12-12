// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { DenoRuntime } from "../../runtimes/deno/deno.ts";
import type { TypeGraph } from "../../typegraph/mod.ts";
import type {
  Context,
  Info,
  PolicyIdx,
  PolicyList,
  Resolver,
  StageId,
  TypeIdx,
} from "../../types.ts";
import type { EffectType, PolicyIndices } from "../../typegraph/types.ts";
import { ensure } from "../../utils.ts";
import { getLogger } from "../../log.ts";
import { Type } from "../../typegraph/type_node.ts";
import type { ArgPolicies } from "./args.ts";
import { BadContext } from "../../errors.ts";

export type PolicyResolverOutput = "DENY" | "ALLOW" | "PASS" | (unknown & {});
type GetResolverResult = (polIdx: PolicyIdx, effect: EffectType) => Promise<PolicyResolverOutput | undefined>;

export interface FunctionSubtreeData {
  typeIdx: TypeIdx;
  isTopLevel: boolean;
  // types referenced in descendant nodes (that is not a descendent of a descendent function)
  referencedTypes: Map<StageId, Array<TypeIdx>>;
}


type CheckResult =
  | { authorized: "ALLOW" }
  | { authorized: "PASS" }
  | {
    authorized: "DENY";
    policiesFailedIdx: Array<PolicyIdx>;
  };

export type OperationPoliciesConfig = {
  timer_policy_eval_retries: number;
};

export class OperationPolicies {
  // should be private -- but would not be testable
  functions: Map<StageId, SubtreeData>;
  private policiesForType: Map<TypeIdx, PolicyList>;
  private resolvers: Map<PolicyIdx, Resolver>;

  constructor(
    private tg: TypeGraph,
    builder: OperationPoliciesBuilder,
    config: OperationPoliciesConfig,
  ) {
    this.functions = builder.subtrees;

    this.policiesForType = new Map();
    for (const [stageId, subtreeData] of this.functions.entries()) {
      // Note: referencedTypes are the types that appear on the query
      const { funcTypeIdx, topLevel, referencedTypes } = subtreeData;
      ensure(
        referencedTypes.has(stageId) &&
          referencedTypes.get(stageId)!.includes(funcTypeIdx),
        "unexpected",
      );

      // Set policies for each referenced type if any (on **selection** output)
      for (const types of referencedTypes.values()) {
        for (const typeIdx of types) {
          if (this.policiesForType.has(typeIdx)) {
            continue;
          }
          const policies = this.tg.type(typeIdx).policies;
          if (policies.length > 0) {
            this.policiesForType.set(typeIdx, policies);
          }
        }
      }

      // top-level functions must have policies
      if (topLevel && !this.policiesForType.has(funcTypeIdx)) {
        const details = [
          `top-level function '${this.tg.type(funcTypeIdx).title}'`,
          `at '${stageId}'`,
        ].join(" ");
        throw new Error(
          `No authorization policy took decision for ${details}'`,
        );
      }
    }

    this.resolvers = new Map();

    const policies = new Set([...this.policiesForType.values()].flat());
    for (const idx of policies) {
      for (const polIdx of iterIndices(idx)) {
        const mat = this.tg.policyMaterializer(this.tg.policy(polIdx));
        const runtime = this.tg.runtimeReferences[mat.runtime] as DenoRuntime;
        ensure(
          runtime.constructor === DenoRuntime,
          "Policies must run on a Deno Runtime",
        );

        if (!this.resolvers.has(polIdx)) {
          this.resolvers.set(
            polIdx,
            runtime.delegate(mat, false, config.timer_policy_eval_retries),
          );
        }
      }
    }
  }

  public async authorize(context: Context, info: Info, verbose: boolean) {
    const logger = getLogger("policies");
    const authorizedTypes: Record<EffectType, Set<TypeIdx>> = {
      read: new Set(),
      create: new Set(),
      update: new Set(),
      delete: new Set(),
    };

    const cache = new Map<PolicyIdx, PolicyResolverOutput>();

    const getResolverResult = async (
      polIdx: PolicyIdx,
      effect: EffectType,
    ): Promise<PolicyResolverOutput | undefined> => {
      verbose &&
        logger.info(
          `checking policy '${
            this.tg.policy(polIdx).name
          }'[${polIdx}] with effect '${effect}'...`,
        );
      if (cache.has(polIdx)) {
        return cache.get(polIdx);
      }

      const resolver = this.resolvers.get(polIdx);
      ensure(
        resolver != null,
        `Could not find resolver for the policy '${
          this.tg.policy(polIdx).name
        }'; effect=${effect}`,
      );

      const res = (await resolver!({
        _: {
          parent: {},
          context,
          info,
          variables: {},
          effect: effect === "read" ? null : effect,
        },
      })) as PolicyResolverOutput;
      cache.set(polIdx, res);
      verbose && logger.info(`> authorize: ${res}`);
      return res;
    };

    for (const [_stageId, subtree] of this.functions) {
      const effect = this.tg.materializer(
        this.tg.type(subtree.funcTypeIdx, Type.FUNCTION).materializer,
      ).effect.effect ?? "read";
      const req = {
        effect,
        authorizedTypesOnEffect: authorizedTypes[effect],
        getResolverResult
      };

      // TODO: maybe collect errors for each stage then fail?
      outerIter: for (const [stageId, refTypes] of subtree.referencedTypes) {
        for (const [stageIdParent, verdict] of this.#resolvedPolicyCachePerStage) {
          // Note: assumes parent id is a path string such as "subject.tags.name"
          // Also assumes that the parent is traversed first as the list is built
          // (e.g. "subject.tags" evaluated before "subject.tags.name")
          if (stageId.startsWith(stageIdParent) && verdict == "ALLOW") {
            continue outerIter;
          }
        }

        await this.#checkPolicyForStage(stageId, refTypes, req);
      }
    }
  }

  getRejectionReason(
    stageId: StageId,
    typeIdx: TypeIdx,
    effect: EffectType,
    policyNames: Array<string>,
  ): string {
    const typ = this.tg.type(typeIdx);
    const details = policyNames
      .map((policyName) => [
        `policy '${policyName}'`,
        `with effect '${effect}'`,
        `on type '${typ.title}' ('${typ.type}')`,
        `at '<root>.${stageId}'`,
      ].join(" "));
    return `Authorization failed for ${details.join(";  ")}`;
  }

  /** 
   * A single type may hold multiple policies
   * 
   * * `ALLOW`: ALLOW & P = P
   * * `DENY`: DENY & P = DENY
   * 
   * DENY and ALLOW combine just like booleans with the AND gate
   * 
   * PASS does not participate.
   **/
  async #composePolicies(
    policies: PolicyIdx[],
    effect: EffectType,
    getResolverResult: GetResolverResult,
  ): Promise<CheckResult> {
    const operands = [];
    const deniersIdx = [];
    for (const policyIdx of policies) {
      const res = await getResolverResult(policyIdx, effect);
      
      switch(res) {
        case "ALLOW": {
          operands.push(true);
          break;
        }
        case "DENY": {
          operands.push(false);
          deniersIdx.push(policyIdx);
          break;
        }
        case "PASS": {
          continue;
        }
        default: {
          // TODO: 
          throw new Error(`Could not take decision on value: ${JSON.stringify(res)}`)
        }
      }
    }

    if (operands.length == 0) {
      return { authorized: "PASS" };
    } else {
      if (operands.every((_bool) => _bool)) {
        return { authorized: "ALLOW" };
      } else {
        return { authorized: "DENY", policiesFailedIdx: deniersIdx }
      }
    }
  }

  #resolvedPolicyCachePerStage: Map<string, PolicyResolverOutput> = new Map();

  async #checkPolicyForStage(
    stageId: string,
    referencedTypes: Array<number>,
    req: {
      effect: EffectType,
      authorizedTypesOnEffect: Set<TypeIdx>,
        getResolverResult: GetResolverResult
    }
  ) {
    for (const typeIdx of referencedTypes) {
      if (req.authorizedTypesOnEffect.has(typeIdx)) {
        continue;
      }


      const allPolicies = this.policiesForType.get(typeIdx) ?? [];
      const policies = allPolicies.map((p) =>
        typeof p === "number" ? p : p[req.effect] ?? null
      );

      if (policies.some((idx) => idx == null)) {
        throw new BadContext(
          this.getRejectionReason(stageId, typeIdx, req.effect, ["__deny"]),
        );
      }
      const res = await this.#composePolicies(
      policies as number[],
        req.effect,
        req.getResolverResult,
      );

      switch(res.authorized) {
        case "ALLOW": {
          this.#resolvedPolicyCachePerStage.set(stageId, "ALLOW");
          req.authorizedTypesOnEffect.add(typeIdx);
          return;
        }
        case "PASS": {
          this.#resolvedPolicyCachePerStage.set(stageId, "PASS");
          continue;
        }
        default: {
          this.#resolvedPolicyCachePerStage.set(stageId, res.authorized);

          if (res.policiesFailedIdx.length == 0) {
            const typ = this.tg.type(typeIdx);
            throw new Error(
              `No policy took decision on type '${typ.title}' ('${typ.type}') at '<root>.${stageId}'`,
            );
          }

          const policyNames = res.policiesFailedIdx.map((idx) => this.tg.policy(idx).name);
          throw new BadContext(
            this.getRejectionReason(stageId, typeIdx, req.effect, policyNames),
          );
        }
      }
    }
  }
}

interface SubtreeData {
  stageId: StageId;
  funcTypeIdx: TypeIdx;
  argPolicies: ArgPolicies;
  topLevel: boolean;
  referencedTypes: Map<StageId, TypeIdx[]>;
}

export class OperationPoliciesBuilder {
  // subtreeStack of function stages
  subtreeStack: SubtreeData[] = [];
  subtrees: Map<StageId, SubtreeData> = new Map();
  currentSubtree: SubtreeData | null = null;

  constructor(
    private tg: TypeGraph,
    private config: OperationPoliciesConfig,
  ) {}

  /** set currentSubtree function stage */
  push(stageId: StageId, funcTypeIdx: TypeIdx, argPolicies: ArgPolicies) {
    const subtreeData = {
      stageId,
      funcTypeIdx,
      argPolicies,
      topLevel: this.subtreeStack.length === 0,
      referencedTypes: new Map(),
    };
    this.currentSubtree = subtreeData;
    this.subtreeStack.push(subtreeData);
    this.subtrees.set(stageId, subtreeData);
  }

  /** set currentSubtree function stage to parent function stage */
  pop(stageId: StageId) {
    ensure(this.subtreeStack.pop()!.stageId === stageId, "unexpected: invalid state");
    const top = this.subtreeStack.pop();
    if (top == null) {
      this.currentSubtree == null;
    } else {
      this.subtreeStack.push(top);
      this.currentSubtree = top;
    }
  }

  #isNamespace(typeIdx: TypeIdx): boolean {
    return this.tg.tg.meta.namespaces!.includes(typeIdx);
  }

  setReferencedTypes(stageId: StageId, ...types: TypeIdx[]): TypeIdx[] {
    if (this.currentSubtree == null) {
      if (this.tg.tg.meta.namespaces!.includes(types[0])) {
        return types;
      }
      throw new Error("unexpected state");
    }
    this.currentSubtree.referencedTypes.set(stageId, types);
    return types;
  }

  build(): OperationPolicies {
    return new OperationPolicies(this.tg, this, this.config);
  }
}

function* iterIndices(indices: PolicyIndices): IterableIterator<number> {
  if (typeof indices === "number") {
    yield indices;
  } else {
    for (const idx of Object.values(indices) as number[]) {
      yield idx;
    }
  }
}
