// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { ComputeStage } from "./engine/query_engine.ts";
import type * as ast from "graphql/ast";
import { decodeBase64, encodeBase64 } from "@std/encoding/base64";
import levenshtein from "levenshtein";
import { None, type Option, Some } from "monads";

import { Type } from "./typegraph/type_node.ts";
import type { TypeGraph } from "./typegraph/mod.ts";

import { BRANCH_NAME_SEPARATOR } from "./engine/computation_engine.ts";

export const maxi32 = 2_147_483_647;

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

type FolderRepr = {
  entryPoint: string;
  base64: string;
  hashes: {
    entryPoint: string; // root/tmp/{tgname}/{hash}
    content: string;
  };
};

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

function isChildStage(parentId: string, stageId: string) {
  return (
    stageId.startsWith(`${parentId}.`) ||
    stageId.startsWith(`${parentId}${BRANCH_NAME_SEPARATOR}`)
  );
}

export function iterParentStages(
  stages: ComputeStage[],
  cb: (stage: ComputeStage, children: ComputeStage[]) => void,
) {
  let cursor = 0;
  while (cursor < stages.length) {
    const stage = stages[cursor];
    const children = stages
      .slice(cursor + 1)
      .filter((s) => isChildStage(stage.id(), s.id()));
    cb(stage, children);
    cursor += 1 + children.length;
  }
}

export const b64decode = (v: string): string => {
  return new TextDecoder().decode(decodeBase64(v));
};

export const b64encode = (v: string): string => {
  return encodeBase64(v);
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
  const indices = names
    .map((name) => tg.type(0, Type.OBJECT).properties?.[name])
    .filter((idx) => idx != null);
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

export async function computeRequestSignature(
  request: Request,
  excludeHeaders?: Array<string>,
) {
  const skipHeaders = (excludeHeaders ?? [])
    .map((key) => key.toLowerCase());
  let newHeaders = [];

  for (const [key, value] of request.headers.entries()) {
    if (skipHeaders.includes(key.toLowerCase())) {
      newHeaders.push([key, value]);
    }
  }
  newHeaders = newHeaders
    .sort(([ka, _va], [kb, _vb]) => ka.localeCompare(kb));

  let body = "";
  const method = request.method;
  const url = new URL(request.url).toString();
  if (request.method !== "GET" && request.method !== "HEAD") {
    const cloned = request.clone();
    body = await cloned.text();
  }

  const data = new TextEncoder().encode([
    method,
    url,
    JSON.stringify(newHeaders),
    body,
  ].join("\n"));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const deepClone = <T>(clonable: T): T =>
  JSON.parse(JSON.stringify(clonable)) as T;
