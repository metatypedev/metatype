// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Agent } from "./agent.ts";

export type ExecutionStatus =
  | "COMPLETED"
  | "COMPLETED_WITH_ERROR"
  | "ONGOING"
  | "UNKNOWN";

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

type SpecialTerms = KVHelper<
  ["run_id", "started_at", "ended_at", "status"],
  Terms
>;

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

    const isOk = result && "Ok" in result;
    const kind = isOk ? "Ok" : "Err";
    const stoppedStatus = isOk ? "COMPLETED" : "COMPLETED_WITH_ERROR";

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

export function evalExpr(
  sResult: SearchItem,
  filter: Expr,
  path: Array<string>,
) {
  const keys = Object.keys(filter) as Array<keyof Expr>;
  if (keys.length != 1) {
    throw new Error(`Invalid expression at ${path.join(".")}`);
  }
  const op = keys[0];
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
        !exprList[fn]((subFilter, index) =>
          evalExpr(sResult, subFilter, [...newPath, `#${index}`])
        )
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
    // Special
    case "run_id":
    case "status":
    case "started_at":
    case "ended_at": {
      const discriminator = sResult[op];
      const repr = new SearchItem(
        sResult.run_id,
        null,
        null,
        sResult.status,
        discriminator,
      );
      return evalTerm(repr, filter[op]!, newPath);
    }
    // Term
    default: {
      if (!evalTerm(sResult, filter, path)) {
        return false;
      }
    }
  }

  return true;
}

function evalTerm(sResult: SearchItem, terms: Terms, path: Array<string>) {
  const value = sResult.value;
  const keys = Object.keys(terms) as Array<keyof Terms>;
  if (keys.length != 1) {
    throw new Error(`Invalid expression at ${path.join(".")}`);
  }

  const op = keys[0];
  const newPath = [...path, op];
  switch (op) {
    case "eq": {
      // term can never compare (null at worst)
      if (value === undefined) {
        return false;
      }

      if (!testCompare(value, toJS(terms[op]))) {
        return false;
      }

      break;
    }
    case "lt":
    case "lte":
    case "gt":
    case "gte": {
      if (!ord(value, toJS(terms[op]), op, newPath)) {
        return false;
      }
      break;
    }
    case "contains":
    case "in": {
      if (!inclusion(value, toJS(terms[op]), op, newPath)) {
        return false;
      }
      break;
    }
    default: {
      throw new Error(`Unknown operator "${op}" at ${path.join(".")}`);
    }
  }

  return true;
}

function toJS(val: string | undefined) {
  // TODO: impl generic JSON on typegate
  // ideally this should be an identity fn
  return JSON.parse(val ?? "null");
}

function testCompare(value: unknown, testValue: unknown) {
  const easy = ["number", "boolean", "string"];
  if (easy.includes(typeof value)) {
    return value === testValue;
  }

  return JSON.stringify(value) == JSON.stringify(testValue);
}

function comparable(a: unknown, b: unknown) {
  return typeof a == typeof b;
}

function ord(l: unknown, r: unknown, cp: keyof ORD, path: Array<string>) {
  if (!comparable(l, r)) {
    return false;
  }

  if (
    (typeof l == "string" && typeof r == "string") ||
    (typeof l == "number" && typeof r == "number")
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
  const [left, right] = cp == "in" ? [l, r] : [r, l];
  if (Array.isArray(right)) {
    // Note: Array.prototype.includes compare item references, not the values
    const leftComp = JSON.stringify(left);
    return right.some((inner) => JSON.stringify(inner) === leftComp);
  } else if (typeof left == "string" && typeof right == "string") {
    return right.includes(left);
  } else if (
    typeof left == typeof right &&
    typeof left == "object" &&
    left != null
  ) {
    // Example: { a: { b: 1 } } in { a: { b: 1 }, c: 2 } => true
    const rightV = (right ?? {}) as Record<string, unknown>;
    for (const [k, leftVal] of Object.entries(left)) {
      const rightVal = rightV[k];
      if (!testCompare(leftVal, rightVal)) {
        return false;
      }
    }

    return true;
  }

  return false;
}
