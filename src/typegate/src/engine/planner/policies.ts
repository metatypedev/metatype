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
  #policiesForType: Map<StageId, PolicyList>;
  #resolvers: Map<PolicyIdx, Resolver>;

  #resolvedPolicyCachePerStage: Map<string, PolicyResolverOutput> = new Map();
  constructor(
    private tg: TypeGraph,
    builder: OperationPoliciesBuilder,
    config: OperationPoliciesConfig,
  ) {
    this.functions = builder.subtrees;

    this.#policiesForType = new Map();
    for (const [stageId, subtree] of this.functions.entries()) {
      const { funcTypeIdx, topLevel, policies } = subtree;
      this.#policiesForType.set(stageId, policies);

      // top-level functions must have policies
      if (topLevel && policies.length === 0) {
        const details = [
          `top-level function '${this.tg.type(funcTypeIdx).title}'`,
          `at '${stageId}'`,
        ].join(" ");
        throw new Error(
          `No authorization policy took decision for ${details}'`,
        );
      }
    }

    this.#resolvers = new Map();
    const policies = new Set([...this.#policiesForType.values()].flat());
    for (const idx of policies) {
      for (const polIdx of iterIndices(idx)) {
        const mat = this.tg.policyMaterializer(this.tg.policy(polIdx));
        const runtime = this.tg.runtimeReferences[mat.runtime] as DenoRuntime;
        ensure(
          runtime.constructor === DenoRuntime,
          "Policies must run on a Deno Runtime",
        );
        if (!this.#resolvers.has(polIdx)) {
          this.#resolvers.set(
            polIdx,
            runtime.delegate(mat, false, config.timer_policy_eval_retries),
          );
        }
      }
    }
  }

  public async authorize(context: Context, info: Info, verbose: boolean) {
    const logger = getLogger("policies");
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

      const resolver = this.#resolvers.get(polIdx);
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

    // TODO refactor: too much indentation
    outerIter: for (const [stageId, subtree] of this.functions) {
      for (const [priorStageId, verdict] of this.#resolvedPolicyCachePerStage.entries()) {
        if (stageId.startsWith(priorStageId) && verdict == "ALLOW") {
          continue outerIter;
        } // elif deny => already thrown
      }

      const { effect, res } = await this.#checkStageAuthorization(stageId, subtree, getResolverResult);
      switch(res.authorized) {
        case "ALLOW": {
          this.#resolvedPolicyCachePerStage.set(stageId, "ALLOW");
          return false;
        }
        case "PASS": {
          this.#resolvedPolicyCachePerStage.set(stageId, "PASS");
          return;
        }
        default: {
          this.#resolvedPolicyCachePerStage.set(stageId, res.authorized);
          const policyNames = res.policiesFailedIdx.map((idx) => this.tg.policy(idx).name);
          throw new BadContext(
            this.getRejectionReason(stageId, effect, policyNames),
          );
        }
      }
    }
  }

  getRejectionReason(
    stageId: StageId,
    effect: EffectType,
    policyNames: Array<string>,
  ): string {
    // if (policyNames.length == 0) {
    //   // invalid state?
    // }
    const details = policyNames
      .map((policyName) => [
        `policy '${policyName}'`,
        `with effect '${effect}'`,
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
          throw new Error(`Could not take decision on value: ${JSON.stringify(res)}, policy must return either "ALLOW", "DENY" or "PASS"`)
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

  async #checkStageAuthorization(stageId: string, subtree: SubtreeData, getResolverResult: GetResolverResult) {
    const effect = this.tg.materializer(
      this.tg.type(subtree.funcTypeIdx, Type.FUNCTION).materializer,
    ).effect.effect ?? "read";

    const policies = subtree.policies.map((p) => {
      if (typeof p === "number") {
        return p;
      }
      return p[effect] ?? null;
    });

    if (policies.some((idx) => idx == null)) {
      throw new BadContext(
        this.getRejectionReason(stageId, effect, ["__deny"]),
      );
    }

    return {
      effect, 
      res: await this.#composePolicies(
        policies as number[],
        effect,
        getResolverResult,
      )
    };
  }
}

interface SubtreeData {
  stageId: StageId;
  funcTypeIdx: TypeIdx;
  // TODO inputPolicies: Map<String, PolicyIndices[]>
  argPolicies: ArgPolicies;
  policies: PolicyIndices[];
  topLevel: boolean;
}

export class OperationPoliciesBuilder {
  // stack of function stages
  stack: SubtreeData[] = [];
  subtrees: Map<StageId, SubtreeData> = new Map();
  current: SubtreeData | null = null;

  constructor(
    private tg: TypeGraph,
    private config: OperationPoliciesConfig,
  ) {}

  // set current function stage
  push(
    stageId: StageId,
    funcTypeIdx: TypeIdx,
    argPolicies: ArgPolicies,
    policies: PolicyIndices[],
  ) {
    const subtreeData = {
      stageId,
      funcTypeIdx,
      argPolicies,
      policies,
      topLevel: this.stack.length === 0,
    };
    this.current = subtreeData;
    this.stack.push(subtreeData);
    this.subtrees.set(stageId, subtreeData);
  }

  // set current function stage to parent function stage
  pop(stageId: StageId) {
    ensure(this.stack.pop()!.stageId === stageId, "unexpected: invalid state");
    const top = this.stack.pop();
    if (top == null) {
      this.current == null;
    } else {
      this.stack.push(top);
      this.current = top;
    }
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
