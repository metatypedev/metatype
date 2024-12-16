// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { DenoRuntime } from "../../runtimes/deno/deno.ts";
import type { TypeGraph } from "../../typegraph/mod.ts";
import type {
  Context,
  Info,
  PolicyIdx,
  Resolver,
  StageId,
  TypeIdx,
} from "../../types.ts";
import type { EffectType, PolicyIndices } from "../../typegraph/types.ts";
import { ensure } from "../../utils.ts";
import { getLogger } from "../../log.ts";
import { getWrappedType, isFunction, isQuantifier, Type } from "../../typegraph/type_node.ts";
import { BadContext } from "../../errors.ts";

export type PolicyResolverOutput = "DENY" | "ALLOW" | "PASS" | (unknown & {});
type GetResolverResult = (polIdx: PolicyIdx, effect: EffectType) => Promise<PolicyResolverOutput | undefined>;


export interface StageMetadata {
  stageId: string;
  typeIdx: TypeIdx;
  isTopLevel: boolean;
}


interface ComposePolicyOperand {
  canonFieldName: string;
  index: PolicyIdx;
}

type CheckResult =
  | { authorized: "ALLOW" }
  | { authorized: "PASS" }
  | {
    authorized: "DENY";
    policiesFailed: Array<ComposePolicyOperand>;
  };

export type OperationPoliciesConfig = {
  timer_policy_eval_retries: number;
};

interface PolicyForStage {
  canonFieldName: string;
  /** Each item is either a PolicyIndicesByEffect or a number */
  indices: Array<PolicyIndices>
}


export class OperationPolicies {
  #stageToPolicies: Map<StageId, Array<PolicyForStage>> = new Map();
  #resolvers: Map<PolicyIdx, Resolver> = new Map();

  constructor(
    private tg: TypeGraph,
    private orderedStageMetadata: Array<StageMetadata>,
    private config: OperationPoliciesConfig,
  ) {

    this.#prepareStageToPolicies();
    this.#preallocateResolvers();
  }


  #prepareStageToPolicies() {
    this.#stageToPolicies = new Map();
    for (const { stageId, typeIdx: rawIdx } of this.orderedStageMetadata) {
      const policies = this.#getPolicies(rawIdx);
      this.#stageToPolicies.set(stageId, policies);
      console.log("> found", stageId, policies);

      // top-level functions must have policies
      const isTopLevel = stageId.split(".").length == 1;
      const policyCount = policies.reduce((total, { indices }) => total + indices.length, 0);
      // FIXME: policy on function not collected?
      // if (isTopLevel && policyCount === 0) {
      //   const details = [
      //     `top-level function '${this.tg.type(rawIdx).title}'`,
      //     `at '${stageId}'`,
      //   ].join(" ");
      //   throw new Error(
      //     `No authorization policy took decision for ${details}'`,
      //   );
      // }
    }
  }

  #preallocateResolvers() {
    this.#resolvers = new Map();
    const policyIndicesWithDup = Array.from(this.#stageToPolicies.values())
      .map((policyPerName) => {
        const indices = policyPerName.map((({ indices }) => indices));
        return indices.flat();
      })
      .flat();

    const policyIndices = new Set(policyIndicesWithDup);

    for (const indicesData of policyIndices) {
      let toPrepare = [] as Array<number>;
      if (typeof indicesData == "number") {
        toPrepare = [indicesData];
      } else {
        toPrepare = Object.values(indicesData);
      }

      for (const polIdx of toPrepare) {
        const mat = this.tg.policyMaterializer(this.tg.policy(polIdx));
        const runtime = this.tg.runtimeReferences[mat.runtime] as DenoRuntime;
        ensure(
          runtime.constructor === DenoRuntime,
          "Policies must run on a Deno Runtime",
        );
        if (!this.#resolvers.has(polIdx)) {
          this.#resolvers.set(
            polIdx,
            runtime.delegate(mat, false, this.config.timer_policy_eval_retries),
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

    const resolvedPolicyCachePerStage: Map<string, PolicyResolverOutput> = new Map();

    outerIter: for (const stageMeta of this.orderedStageMetadata) {
      const { stageId } = stageMeta;

      console.log("verdict for", stageId);

      for (const [priorStageId, verdict] of resolvedPolicyCachePerStage.entries()) {
        if (stageId.startsWith(priorStageId) && verdict == "ALLOW") {
          continue outerIter;
        } // elif deny => already thrown
      }

      const { effect, res } = await this.#checkStageAuthorization(stageMeta, getResolverResult);
      
      switch(res.authorized) {
        case "ALLOW": {
          resolvedPolicyCachePerStage.set(stageId, "ALLOW");
          continue;
        }
        case "PASS": {
          resolvedPolicyCachePerStage.set(stageId, "PASS");
          continue;
        }
        default: {
          resolvedPolicyCachePerStage.set(stageId, res.authorized);
          const policyNames = res.policiesFailed.map((operand) => ({
            name: this.tg.policy(operand.index).name,
            concernedField: operand.canonFieldName
          }));

          throw new BadContext(
            this.getRejectionReason(stageId,  effect, policyNames),
          );
        }
      }
    }
  }

  getRejectionReason(
    stageId: StageId,
    effect: EffectType,
    policiesData: Array<{ name: string, concernedField: string }>,
  ): string {
    const details = policiesData
      .map(({ name, concernedField }) => [
        `policy '${name}'`,
        `with effect '${effect}'`,
        `at '<root>.${stageId}.${concernedField}'`,
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
    policies: Array<ComposePolicyOperand>,
    effect: EffectType,
    getResolverResult: GetResolverResult,
  ): Promise<CheckResult> {
    const operands = [];
    const deniersIdx = [];
    for (const operand of policies) {
      const res = await getResolverResult(operand.index, effect);
      
      switch(res) {
        case "ALLOW": {
          operands.push(true);
          break;
        }
        case "DENY": {
          operands.push(false);
          deniersIdx.push(operand);
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
        return { authorized: "DENY", policiesFailed: deniersIdx }
      }
    }
  }

  #getPolicies(typeIdx: number): Array<PolicyForStage> {
    let nestedTypeIdx = typeIdx;
    let nestedSchema = this.tg.type(nestedTypeIdx);

    if (isFunction(nestedSchema)) {
      // TODO: collect the policies on the function as part of the oeprands
      nestedTypeIdx = nestedSchema.output;
      nestedSchema = this.tg.type(nestedTypeIdx);
    }

    while (isQuantifier(nestedSchema)) {
      nestedTypeIdx = getWrappedType(nestedSchema);
      nestedSchema = this.tg.type(nestedTypeIdx);
    }

    let out: Record<string, Array<PolicyIndices>> = {};
    if(nestedSchema.type == "object") {
      out = nestedSchema.policies ?? {};
    }

    return Object.entries(out).map(([k, v]) => ({
      canonFieldName: k,
      indices: v
    }))
  }

  #getEffectOrDefault(typeIdx: number) {
    let effect = "read" as EffectType;
    const node = this.tg.type(typeIdx);
    if (isFunction(node)) {
      const matIdx = this.tg.type(typeIdx, Type.FUNCTION).materializer;
      effect = this.tg.materializer(matIdx).effect.effect ?? effect;
    }

    return effect;
  }


  async #checkStageAuthorization(
    { stageId, typeIdx }: StageMetadata, 
    getResolverResult: GetResolverResult
  ) {
    const effect = this.#getEffectOrDefault(typeIdx);

    const policiesForStage = this.#stageToPolicies.get(stageId) ?? [];
    const policies = [];
    for (const { canonFieldName, indices } of policiesForStage) {
      for (const index of indices) {

        if (typeof index == "number") {
          policies.push({ canonFieldName, index })
        } else {
          const actualIndex = index[effect] ?? null;
          if (actualIndex == null) {
            throw new BadContext(
              this.getRejectionReason(stageId, effect, [{
                name: "__deny",
                concernedField: canonFieldName
              }]),
            );
          }

          

          policies.push({ canonFieldName, index: actualIndex })
        }
      }
    }

    return {
      effect,
      res: await this.#composePolicies(
        policies,
        effect,
        getResolverResult,
      )
    };
  }
}
