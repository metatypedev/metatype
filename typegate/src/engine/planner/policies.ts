// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { DenoRuntime } from "../../runtimes/deno/deno.ts";
import { TypeGraph } from "../../typegraph/mod.ts";
import {
  Context,
  Info,
  PolicyIdx,
  PolicyList,
  Resolver,
  StageId,
  TypeIdx,
} from "../../types.ts";
import { EffectType, PolicyIndices } from "../../typegraph/types.ts";
import { ensure } from "../../utils.ts";
import { getLogger } from "../../log.ts";
import { Type } from "../../typegraph/type_node.ts";
import { ArgPolicies } from "./args.ts";
import { BadContext } from "../../errors.ts";

export interface FunctionSubtreeData {
  typeIdx: TypeIdx;
  isTopLevel: boolean;
  // types referenced in descendant nodes (that is not a descendent of a descendent function)
  referencedTypes: Map<StageId, Array<TypeIdx>>;
}

interface GetResolverResult {
  (polIdx: PolicyIdx, effect: EffectType): Promise<boolean | null>;
}

type CheckResult = { authorized: true } | {
  authorized: false;
  policyIdx: PolicyIdx | null;
};

export class OperationPolicies {
  // should be private -- but would not be testable
  functions: Map<StageId, SubtreeData>;
  private policyLists: Map<TypeIdx, PolicyList>;
  private resolvers: Map<PolicyIdx, Resolver>;

  constructor(
    private tg: TypeGraph,
    builder: OperationPoliciesBuilder,
  ) {
    this.functions = builder.subtrees;

    this.policyLists = new Map();
    for (const [stageId, subtree] of this.functions.entries()) {
      const { funcTypeIdx, topLevel, referencedTypes } = subtree;
      ensure(
        referencedTypes.has(stageId) &&
          referencedTypes.get(stageId)!.includes(funcTypeIdx),
        "unexpected",
      );
      for (const types of referencedTypes.values()) {
        // set policyLists
        for (const typeIdx of types) {
          if (this.policyLists.has(typeIdx)) {
            continue;
          }
          const policies = this.tg.type(typeIdx).policies;
          if (policies.length > 0) {
            this.policyLists.set(typeIdx, policies);
          }
        }
      }

      // top-level functions must have policies
      if (topLevel && !this.policyLists.has(funcTypeIdx)) {
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
    const policies = new Set([...this.policyLists.values()].flat());
    for (const idx of policies) {
      for (const polIdx of iterIndices(idx)) {
        const mat = this.tg.policyMaterializer(this.tg.policy(polIdx));
        const runtime = this.tg.runtimeReferences[mat.runtime] as DenoRuntime;
        ensure(
          runtime.constructor === DenoRuntime,
          "Policies must run on a Deno Runtime",
        );
        if (!this.resolvers.has(polIdx)) {
          this.resolvers.set(polIdx, runtime.delegate(mat, false));
        }
      }
    }
  }

  public async authorize(
    context: Context,
    info: Info,
    verbose: boolean,
  ) {
    const logger = getLogger("policies");
    const authorizedTypes: Record<EffectType, Set<TypeIdx>> = {
      "read": new Set(),
      "create": new Set(),
      "update": new Set(),
      "delete": new Set(),
    };

    const cache = new Map<PolicyIdx, boolean | null>();

    const getResolverResult = async (
      idx: PolicyIdx,
      effect: EffectType,
    ): Promise<boolean | null> => {
      verbose &&
        logger.info(
          `checking policy '${
            this.tg.policy(idx).name
          }'[${idx}] with effect '${effect}'...`,
        );
      if (cache.has(idx)) {
        return cache.get(idx) as boolean | null;
      }

      const resolver = this.resolvers.get(idx);
      ensure(
        resolver != null,
        `Could not find resolver for the policy '${
          this.tg.policy(idx).name
        }'; effect=${effect}`,
      );

      const res = await resolver!({
        _: {
          parent: {},
          context,
          info,
          variables: {},
          effect: effect === "read" ? null : effect,
        },
      }) as boolean | null;
      cache.set(idx, res);
      verbose && logger.info(`> authorize: ${res}`);
      return res;
    };

    // TODO refactor: too much indentation
    for (const [_stageId, subtree] of this.functions) {
      const effect = this.tg.materializer(
        this.tg.type(subtree.funcTypeIdx, Type.FUNCTION).materializer,
      ).effect.effect ?? "read";

      this.authorizeArgs(
        subtree.argPolicies,
        effect,
        getResolverResult,
        authorizedTypes[effect],
      );

      for (const [stageId, types] of subtree.referencedTypes) {
        for (const typeIdx of types) {
          if (authorizedTypes[effect].has(typeIdx)) {
            continue;
          }
          const policies = (this.policyLists.get(typeIdx) ?? []).map((p) =>
            typeof p === "number" ? p : p[effect] ?? null
          );

          if (policies.some((idx) => idx == null)) {
            throw new BadContext(
              this.getRejectionReason(stageId, typeIdx, effect, "__deny"),
            );
          }

          const res = await this.checkTypePolicies(
            policies as number[],
            effect,
            getResolverResult,
          );

          if (res.authorized) {
            continue;
          }

          if (res.policyIdx == null) {
            const typ = this.tg.type(typeIdx);
            throw new Error(
              `No policy took decision on type '${typ.title}' ('${typ.type}') at '<root>.${stageId}'`,
            );
          }

          const policyName = this.tg.policy(res.policyIdx).name;
          throw new BadContext(
            this.getRejectionReason(stageId, typeIdx, effect, policyName),
          );
        }
      }
    }
  }

  getRejectionReason(
    stageId: StageId,
    typeIdx: TypeIdx,
    effect: EffectType,
    policyName: string,
  ): string {
    const typ = this.tg.type(typeIdx);
    const details = [
      `policy '${policyName}'`,
      `with effect '${effect}'`,
      `on type '${typ.title}' ('${typ.type}')`,
      `at '<root>.${stageId}'`,
    ].join(" ");
    return `Authorization failed for ${details}`;
  }

  private async authorizeArgs(
    argPolicies: ArgPolicies,
    effect: EffectType,
    getResolverResult: GetResolverResult,
    authorizedTypes: Set<TypeIdx>,
  ) {
    for (const [typeIdx, { argDetails, policyIndices }] of argPolicies) {
      if (authorizedTypes.has(typeIdx)) {
        continue;
      }
      authorizedTypes.add(typeIdx);

      const res = await this.checkTypePolicies(
        policyIndices,
        effect,
        getResolverResult,
      );
      if (!res.authorized) {
        // unauthorized or no decision
        throw new Error(`Unexpected argument ${argDetails}`);
      }
    }
  }

  private async checkTypePolicies(
    policies: PolicyIdx[],
    effect: EffectType,
    getResolverResult: GetResolverResult,
  ): Promise<CheckResult> {
    if (policies.length === 0) {
      return { authorized: true };
    }

    for (const polIdx of policies) {
      const res = await getResolverResult(polIdx, effect);
      if (res == null) {
        continue;
      }
      if (res) {
        return { authorized: true };
      }

      return { authorized: false, policyIdx: polIdx };
    }

    return { authorized: false, policyIdx: null };
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
  // stack of function stages
  stack: SubtreeData[] = [];
  subtrees: Map<StageId, SubtreeData> = new Map();
  current: SubtreeData | null = null;

  constructor(private tg: TypeGraph) {}

  // set current function stage
  push(
    stageId: StageId,
    funcTypeIdx: TypeIdx,
    argPolicies: ArgPolicies,
  ) {
    const subtreeData = {
      stageId,
      funcTypeIdx,
      argPolicies,
      topLevel: this.stack.length === 0,
      referencedTypes: new Map(),
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

  setReferencedTypes(stageId: StageId, ...types: TypeIdx[]): TypeIdx[] {
    if (this.current == null) {
      if (this.tg.type(types[0]).config?.["__namespace"]) {
        return types;
      }
      throw new Error("unexpected state");
    }
    this.current.referencedTypes.set(stageId, types);
    return types;
  }

  build(): OperationPolicies {
    return new OperationPolicies(this.tg, this);
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
