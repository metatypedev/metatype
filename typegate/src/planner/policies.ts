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
import { EffectType } from "../types/typegraph.ts";
import { ensure } from "../utils.ts";
import { mapValues } from "std/collections/map_values.ts";
import { getLogger } from "../log.ts";
import { Type } from "../type_node.ts";

export interface FunctionSubtreeData {
  typeIdx: TypeIdx;
  isTopLevel: boolean;
  // types referenced in descendant nodes (that is not a descendent of a descendent function)
  referencedTypes: Map<StageId, Array<TypeIdx>>;
}

export class OperationPolicies {
  private functions: Map<StageId, SubtreeData>;
  private policyLists: Map<TypeIdx, PolicyList>;
  private resolvers: Map<PolicyIdx, Record<EffectType | "none", Resolver>>;

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

  public async authorize(
    context: Context,
    args: Record<string, unknown>,
    verbose: boolean,
  ) {
    const logger = getLogger("policies");
    const authorizedTypes: Record<EffectType | "none", Set<TypeIdx>> = {
      "none": new Set(),
      "create": new Set(),
      "update": new Set(),
      "delete": new Set(),
      "upsert": new Set(),
    };

    const cache = new Map<
      PolicyIdx,
      Partial<Record<EffectType | "none", boolean | null>>
    >();

    const getResolverResult = async (
      idx: PolicyIdx,
      effect: EffectType | "none",
    ): Promise<boolean | null> => {
      verbose &&
        logger.info(
          `checking policy '${
            this.tg.policy(idx).name
          }'[${idx}] with effect '${effect}'...`,
        );
      if (!cache.has(idx)) {
        cache.set(idx, {});
      }
      const entries = cache.get(idx)!;
      if (effect in entries) {
        verbose && logger.info(`> authorize: ${entries[effect]} (from cache)`);
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
      verbose && logger.info(`> authorize: ${res}`);
      return res;
    };

    for (const [_stageId, subtree] of this.functions) {
      const effect = this.tg.materializer(
        this.tg.type(subtree.funcTypeIdx, Type.FUNCTION).materializer,
      ).effect.effect ?? "none";
      for (const [stageId, types] of subtree.referencedTypes) {
        for (const typeIdx of types) {
          if (authorizedTypes[effect].has(typeIdx)) {
            continue;
          }
          let res: boolean | null;
          for (const idx of this.policyLists.get(typeIdx) ?? []) {
            res = await getResolverResult(idx, effect);
            if (res == null) {
              continue;
            }
            if (res) {
              break;
            }

            const policyName = this.tg.policy(idx).name;
            const typeName = this.tg.type(typeIdx).title;
            const details = [
              `policy '${policyName}'`,
              `with effect '${effect}'`,
              `on type '${typeName}'`,
              `at '<root>.${stageId}'`,
            ].join(" ");
            throw new Error(
              `Authorization failed for ${details}`,
            );
          }
        }
      }
    }
  }
}

interface SubtreeData {
  stageId: StageId;
  funcTypeIdx: TypeIdx;
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
  push(stageId: StageId, funcTypeIdx: TypeIdx) {
    const subtreeData = {
      stageId,
      funcTypeIdx,
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

interface TypePolicies {
  list: PolicyList;
  stages: StageId[];
}

interface FunctionPolicies {
  funcTypeIdx: TypeIdx;
  isRootFunc: boolean;
  policies: Map<TypeIdx, TypePolicies>;
}
