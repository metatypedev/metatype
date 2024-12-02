// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ExecutionStatus } from "../substantial.ts";
import { Agent } from "./agent.ts";

type KVHelper<T extends string[], V> = {
  // should be a union type but it is not very helpful with autocomplete
  [K in T[number]]?: V;
};
type AND = { and?: Array<Expr> };
type OR = { or?: Array<Expr> };
type NOT = { not?: Expr };

// JSON string is currently the only way to do generics on a typegraph
type ORD = KVHelper<["eq", "lt", "lte", "gt", "gte"], string>;
type INCL = KVHelper<["in", "contains"], string>;
type Terms = ORD & INCL;

type SpecialTerms = KVHelper<["started_at", "ended_at", "status"], Terms>;

export type Expr = Terms & SpecialTerms & AND & OR & NOT;

export class SearchItem {
  constructor(
    public readonly run_id: string,
    public readonly started_at: string | null,
    public readonly ended_at: string | null,
    public readonly status: ExecutionStatus,
    public readonly value?: unknown,
  ) {}

  toSearchResult() {
    return {
      run_id: this.run_id,
      started_at: this.started_at,
      ended_at: this.ended_at,
      status: this.status,
      value: this.value === undefined ? undefined : JSON.stringify(this.value),
    };
  }
}

export async function buildSearchableItems(
  workflowName: string,
  agent: Agent,
): Promise<Array<SearchItem>> {
  const relatedRuns = await agent.retrieveLinks(workflowName);
  const searchList = [] as Array<SearchItem>;
  for (const runId of relatedRuns) {
    const run = await agent.retrieveEvents(runId);
    const startedAt = run.operations[0]?.at;
    let endedAt, result: any;

    let hasStopped = false;
    for (const op of run.operations) {
      if (op.event.type == "Stop") {
        endedAt = op.at;
        result = op.event.result;
        hasStopped = true;
        break;
      }
    }

    const isOk = "Ok" in result;
    const kind = isOk ? "Ok" : "Err";
    const stoppedStatus = isOk ? "COMPLETED_WITH_ERROR" : "COMPLETED";

    searchList.push(
      new SearchItem(
        runId,
        startedAt ?? null,
        endedAt ?? null,
        hasStopped ? stoppedStatus : "ONGOING",
        hasStopped ? result[kind] : undefined,
      ),
    );
  }

  return searchList;
}

export async function applyFilter(
  workflowName: string,
  agent: Agent,
  filter: Expr,
) {
  const searchableItems = await buildSearchableItems(workflowName, agent);
  const searchResults = [];
  for (const item of searchableItems) {
    if (evalExpr(item, filter, ["<root>"])) {
      searchResults.push(item.toSearchResult());
    }
  }

  return searchResults;
}

function evalExpr(sResult: SearchItem, filter: Expr, path: Array<string>) {
  for (const k in filter) {
    const op = k as unknown as keyof Expr;
    const newPath = [...path, op];
    switch (op) {
      // Expr
      case "and":
      case "or": {
        const exprList = filter[op];
        if (!Array.isArray(exprList)) {
          // should be unreachable since filter is validated at push
          throw new Error(`Fatal: array expected at ${path.join(".")}`);
        }
        const fn = op == "or" ? "some" : "every";
        if (
          !exprList[fn]((subFilter) => evalExpr(sResult, subFilter, newPath))
        ) {
          return false;
        }
        break;
      }
      case "not": {
        if (evalExpr(sResult, filter["not"]!, newPath)) {
          return false;
        }
        break;
      }
      // special
      case "status":
      case "started_at":
      case "ended_at": {
        const discriminator = sResult[op];
        const repr = new SearchItem(
          sResult.run_id,
          sResult.started_at,
          sResult.ended_at,
          sResult.status,
          discriminator,
        );
        return evalTerm(repr, filter[op]!, newPath);
      }
      // Term
      default: {
        if (!evalTerm(sResult, filter, newPath)) {
          return false;
        }
      }
    }
  }

  return true;
}

function evalTerm(sResult: SearchItem, terms: Terms, path: Array<string>) {
  const value = sResult.value;

  for (const k in terms) {
    const op = k as unknown as keyof Terms;
    const term = JSON.parse(terms[op] ?? "null"); // TODO: impl generic JSON on typegate
    const newPath = [...path, op];
    switch (op) {
      case "eq": {
        if (value != term) {
          return false;
        }
        break;
      }
      case "lt":
      case "lte":
      case "gt":
      case "gte": {
        if (!ord(value, term, op, newPath)) {
          return false;
        }
        break;
      }
      case "contains":
      case "in": {
        if (
          !inclusion(value, term, op, newPath)
        ) {
          return false;
        }
        break;
      }
      default: {
        throw new Error(`Unknown operator at ${newPath.join(".")}`);
      }
    }
  }

  return true;
}

function comparable(a: unknown, b: unknown) {
  return typeof a == typeof b;
}

function ord(l: unknown, r: unknown, cp: keyof ORD, path: Array<string>) {
  if (!comparable(l, r)) {
    return false;
  }

  if (
    typeof l == "string" && typeof r == "string" ||
    typeof l == "number" && typeof r == "number"
  ) {
    switch (cp) {
      case "lt":
        return l < r;
      case "lte":
        return l <= r;
      case "gt":
        return l > r;
      case "gte":
        return l >= r;
      default: {
        throw new Error(
          `Unknown comparison operator "${cp}" at ${path.join(",")}`,
        );
      }
    }
  }

  return false;
}

function inclusion(
  l: unknown,
  r: unknown,
  cp: keyof INCL,
  _newPath: Array<string>,
) {
  if (!comparable(l, r)) {
    return false;
  }

  const [left, right] = cp == "in" ? [l, r] : [r, l];
  if (Array.isArray(right)) {
    // FIXME: does not work with [ [[1]] ].includes([[1]])
    return right.includes(left);
  } else if (
    typeof left == typeof right && typeof left == "object" && left != null
  ) {
    // { a: { b: 1 } } in { a: { b: 1 }, c: 2 } := true
    const rightV = (right ?? {}) as Record<string, unknown>;
    for (const [k, leftVal] of Object.entries(left)) {
      const rightVal = rightV[k];
      if (leftVal != rightVal) {
        return false;
      }
    }

    return true;
  }

  return false;
}
