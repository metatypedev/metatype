// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { distinct } from "std/collections/distinct.ts";
import { ComputeStage } from "../engine.ts";
import { OperationPolicies } from "../planner/policies.ts";
import { RateLimit } from "../rate_limiter.ts";
import { Context, Info, Parents } from "../types.ts";
import { JSONValue } from "../utils.ts";

// character marking the starting of the branch name in the path segment
export const BRANCH_NAME_SEPARATOR = "$";

function withEmptyObjects(res: unknown): unknown {
  if (Array.isArray(res)) {
    return res.map(withEmptyObjects);
  }
  return typeof res === "object" && res != null ? {} : res;
}

function getParentId(stageId: string): string | null {
  const lastSeparatorIndex = stageId.lastIndexOf(".");
  if (lastSeparatorIndex < 0) {
    return null;
  }
  return stageId.slice(0, lastSeparatorIndex);
}

function getBranchNameFromParentId(parentId: string) {
  const separatorIndex = parentId.lastIndexOf(BRANCH_NAME_SEPARATOR);
  if (separatorIndex < 0) {
    throw new Error("expected parentId to end with a branch name");
  }
  const branch = parentId.slice(separatorIndex);
  if (branch.indexOf(".") >= 0) {
    // branch name is not on the last path segment
    throw new Error("expected parentId to end with a branch name");
  }
  return branch;
}

interface BranchSelection {
  level: number;
  // name of active branch in the selection
  // a compute stage belonging the branch will be skipped if there are no matching value
  // from the parent (based on `childSelection`)
  select: string | null;
}

// Compute the result according to the given computation plan and additionnal
// contexts
export class ComputationEngine {
  ret: Record<string, unknown> = {};

  // Array of the raw values returned by the resolver of each stage.
  // Note: Arrays are flattened and null values are filtered out by the batcher
  cache: Record<string, unknown[]> = {};

  // Array of the values corresponding to the result of each stage.
  // Objects are references to objects nested within `ret`; only containing
  // fields that are to be included in the final result.
  // Note: Arrays are flattened and null values are filtered out by the batcher
  lenses: Record<string, unknown[]> = {};

  // stack of active selections
  activeSelections: BranchSelection[] = [];

  // execute the plan to compute the result
  public static async compute(
    plan: ComputeStage[],
    policies: OperationPolicies,
    context: Context,
    info: Info,
    variables: Record<string, unknown>,
    limit: RateLimit | null,
    verbose: boolean,
  ): Promise<Record<string, JSONValue>> {
    await policies.authorize(context, info, verbose);

    const computationEngine = new ComputationEngine(
      context,
      info,
      variables,
      limit,
      // verbose,
    );

    for await (const stage of plan) {
      await computationEngine.executeStage(stage);
    }

    return computationEngine.ret as Record<string, JSONValue>;
  }

  private constructor(
    private context: Context,
    private info: Info,
    private variables: Record<string, unknown>,
    private limit: RateLimit | null,
    // private verbose: boolean,
  ) {}

  async executeStage(stage: ComputeStage) {
    const { path, resolver, effect, rateCalls, rateWeight } = stage.props;
    const level = path.length;
    const stageId = stage.id();
    const parentId = getParentId(stageId);

    this.updateSelectedBranch(level, parentId);
    const deps = this.getDeps(stage, parentId);

    // parent values ( full values )
    const previousValues = parentId ? this.cache[parentId] : [{}];
    if (previousValues == null) {
      // no matching value for the brach
      return;
    }

    if (rateCalls) {
      this.consumeLimit(rateWeight ?? 1);
    }

    const res = await Promise.all(
      previousValues.map((parent) =>
        resolver!({
          ...this.computeArgs(stage, parent as Parents),
          _: {
            // parent: parent ?? {},
            parent: parent as Parents,
            context: this.context,
            info: this.info,
            variables: this.variables,
            effect,
            ...deps,
          },
        })
      ),
    );

    if (!rateCalls) {
      this.consumeLimit(res.length * (rateWeight ?? 1));
    }

    this.registerResult(stage, stageId, parentId, res);
  }

  private registerResult(
    stage: ComputeStage,
    stageId: string,
    parentId: string | null,
    res: unknown[],
  ) {
    // parent values (collected fields)
    const lens = parentId ? this.lenses[parentId] : [this.ret];

    if (lens.length !== res.length) {
      const lengths = `${lens.length} != ${res.length}`;
      const details = `${JSON.stringify(lens)}, ${JSON.stringify(res)}`;
      throw new Error(
        `at stage ${stageId}: cannot align array results ${lengths}: ${details}`,
      );
    }

    const { path, node, batcher, excludeResult = false } = stage.props;

    this.cache[stageId] = batcher(res);

    const field = path[path.length - 1];
    // only root??
    if (node !== "" && !excludeResult) {
      (lens as Array<Record<string, unknown>>).forEach((l, i) => {
        // Objects are replaced by empty objects `{}`.
        // It will be populated by child compute stages using values in `cache`.
        l[field] = withEmptyObjects(res[i]);
      });

      // TODO
      this.lenses[stageId] = lens.flatMap((l) =>
        batcher([(l as Record<string, unknown>)[field]]) ?? []
      );
    }

    this.pushChildSelection(stage, stageId);
  }

  private getDeps(stage: ComputeStage, parentId: string | null) {
    // TODO what if the dependency has not been computed yet??? (not in cache)
    return stage.props.dependencies.filter((dep) => dep != parentId)
      .filter((dep) => !(parentId && dep.startsWith(`${parentId}`)))
      .reduce((agg, dep) => ({ ...agg, [dep]: this.cache[dep] }), {});
  }

  private updateSelectedBranch(currentLevel: number, parentId: string | null) {
    while (
      this.topSelection != null && currentLevel < this.topSelection.level
    ) {
      // top branch selections exhausted
      this.activeSelections.pop();
    }

    const selection = this.topSelection;
    if (selection == null) {
      return;
    }

    if (selection.level === currentLevel) {
      // potential branch selection transition
      selection.select = getBranchNameFromParentId(parentId!);
    }
  }

  private consumeLimit(n: number) {
    if (this.limit != null) {
      this.limit.consume(n);
    }
  }

  private pushChildSelection(stage: ComputeStage, stageId: string) {
    const { childSelection, path } = stage.props;
    if (childSelection == null) {
      return;
    }

    const currentLevel = path.length;

    if (
      this.topSelection != null && this.topSelection.level + 1 === currentLevel
    ) {
      // nested union/either should have been flattened
      throw new Error();
    }

    const branches = this.cache[stageId].map((res) => {
      const branch = childSelection(res);
      if (branch == null) {
        throw new Error(
          `at stage ${stageId}: No matching branch for the result`,
        );
      }
      return branch;
    });

    for (const branch of distinct(branches)) {
      const p = `${stageId}${BRANCH_NAME_SEPARATOR}${branch}`;
      this.cache[p] = [];
      this.lenses[p] = [];
    }

    for (const [i, branch] of branches.entries()) {
      const p = `${stageId}${BRANCH_NAME_SEPARATOR}${branch}`;
      if (this.cache[p] == null) {
        this.cache[p] = [];
        this.lenses[p] = [];
      }
      this.cache[p].push(this.cache[stageId][i]);
      this.lenses[p].push(this.lenses[stageId][i]);
    }

    this.activeSelections.push({
      level: currentLevel + 1,
      select: null,
    });
  }

  private computeArgs(
    stage: ComputeStage,
    parent: Parents,
  ): Record<string, unknown> {
    const { args: compute, effect } = stage.props;
    if (compute == null) {
      return {};
    }

    return compute({
      variables: this.variables,
      context: this.context,
      parent,
      effect,
    });
  }

  // static
  private get topSelection(): BranchSelection | null {
    return this.activeSelections.length > 0
      ? this.activeSelections[this.activeSelections.length - 1]
      : null;
  }
}
