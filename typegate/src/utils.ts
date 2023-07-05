// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type { ComputeStage } from "./engine.ts";
import * as ast from "graphql/ast";
import * as base64 from "std/encoding/base64.ts";
import levenshtein from "levenshtein";
import { None, Option, Some } from "monads";
import { deepMerge } from "std/collections/deep_merge.ts";

import { z } from "zod";

import { Type } from "./type_node.ts";
import type { TypeGraph } from "./typegraph.ts";

export const maxi32 = 2_147_483_647;

export const configOrExit = async <T extends z.ZodRawShape>(
  sources: Record<string, unknown>[],
  schema: T,
) => {
  const parsing = await z.object(schema).safeParse(
    sources.reduce((a, b) => deepMerge(a, b), {}),
  );

  if (!parsing.success) {
    console.error(parsing.error);
    Deno.exit(1);
  }

  return parsing.data;
};

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// Map undefined | null to None
export const forceAnyToOption = (v: any): Option<any> => {
  return v === undefined || v === null ? None : Some(v);
};

// Map None to undefined
export const forceOptionToValue = <T>(m: Option<T>): T | undefined => {
  return m.isSome() ? m.unwrap() : undefined;
};

export const createUrl = (
  base: string,
  path: string,
  search_params?: URLSearchParams,
): string => {
  if (!base.endsWith("/")) {
    base = base + "/";
  }

  // replace repeating / to a single /
  const [path_section, param_section] = path.replace(/[\/]+/g, "/").split("?");

  const prefix = path_section.startsWith("/") ? "." : "";
  const url = new URL(prefix + path_section, base);

  if (param_section) {
    const path_search_params = new URLSearchParams(param_section);
    for (const [key, value] of path_search_params.entries()) {
      url.searchParams.append(key, value);
    }
  }

  if (search_params) {
    for (const [key, value] of search_params.entries()) {
      url.searchParams.append(key, value);
    }
  }

  return url.href;
};

export function ensure(
  predicat: boolean,
  message: string | (() => string),
): asserts predicat is true {
  if (!predicat) {
    throw Error(typeof message === "function" ? message() : message);
  }
}

export function ensureNonNullable<T>(
  value: T,
  message: string | (() => string),
): asserts value is NonNullable<T> {
  if (value == null) {
    throw Error(typeof message === "function" ? message() : message);
  }
}

export const collectFields = (
  obj: Record<string, unknown>,
  fields: string[],
) => {
  return fields.reduce((agg, f) => ({ ...agg, [f]: obj[f] }), {});
};

export const unparse = (loc: ast.Location): string => {
  return loc.source.body.slice(loc.start, loc.end);
};

/**
 * Formats provided value with proper identation for a prettier printing of the
 * value, useful for debugging or displaying errors.
 */
export function toPrettyJSON(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function iterParentStages(
  stages: ComputeStage[],
  cb: (stage: ComputeStage, children: ComputeStage[]) => void,
) {
  let cursor = 0;
  while (cursor < stages.length) {
    const stage = stages[cursor];
    const children = stages.slice(cursor + 1).filter((s) =>
      s.id().startsWith(stage.id())
    );
    cb(stage, children);
    cursor += 1 + children.length;
  }
}

export const b64decode = (v: string): string => {
  return new TextDecoder().decode(base64.decode(v));
};

export const b64encode = (v: string): string => {
  return base64.encode(v);
};

export function nativeResult<R>(
  res: { Ok: R } | { Err: { message: string } },
): R {
  if ("Err" in res) {
    throw new Error(res.Err.message);
  }
  return res.Ok;
}

export function nativeVoid(res: "Ok" | { Err: { message: string } }): void {
  if (res !== "Ok") {
    throw new Error(res.Err.message);
  }
  return;
}

export function pluralSuffix(count: number) {
  return count === 1 ? "" : "s";
}

export function closestWord(
  str: string,
  list: string[],
  ignoreCase = true,
  maxDistance = 3,
) {
  if (list.length == 0) {
    return null;
  }
  const [top] = list
    .map((word) => {
      const s = ignoreCase ? str.toLowerCase() : str;
      const t = ignoreCase ? word.toLowerCase() : word;
      return { word, score: levenshtein(s, t) };
    })
    .sort((a, b) => a.score - b.score);
  if (top.score > maxDistance) {
    return null;
  }
  return top.word;
}

/**
 * Idea:
 * query: [a1, a2, ..], mutation: [b1, a1, b2, ..], ...
 * => a1: [query, mutation], a2: [query], ..., b1: [mutation] ...
 */
export function getReverseMapNameToQuery(tg: TypeGraph, names: string[]) {
  const indices = names.map((name) =>
    tg.type(0, Type.OBJECT).properties?.[name]
  ).filter((idx) => idx != null);
  const res = new Map<string, Set<string>>();

  for (const idx of indices) {
    const { fields, title } = collectFieldNames(tg, idx);
    for (const name of fields) {
      if (res.has(name)) {
        res.get(name)!.add(title);
      } else {
        res.set(name, new Set<string>([title]));
      }
    }
  }

  return res;
}

export function collectFieldNames(tg: TypeGraph, typeIdx: number) {
  const typ = tg.type(typeIdx);
  if (typ && typ.type === Type.OBJECT) {
    return { title: typ.title, fields: Object.keys(typ.properties ?? {}) };
  }
  return { title: typ?.title, fields: [] };
}
