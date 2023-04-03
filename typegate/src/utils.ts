// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import type { ComputeStage } from "./engine.ts";
import * as ast from "graphql/ast";
import * as base64 from "std/encoding/base64.ts";
import { None, Option, Some } from "monads";
import { deepMerge } from "std/collections/deep_merge.ts";
import { z } from "zod";

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

export const ensure = (predicat: boolean, message: string | (() => string)) => {
  if (!predicat) {
    throw Error(typeof message === "function" ? message() : message);
  }
};

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
