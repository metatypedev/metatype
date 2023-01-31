// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { ComputeStage } from "./engine.ts";
import * as ast from "graphql/ast";
import * as base64 from "std/encoding/base64.ts";
import { None, Option, Some } from "monads";

export type Maybe<T> = Option<T>;

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export const liftMaybe = <T>(v: null | undefined | T): Maybe<T> => {
  return v ? Some(v) : None;
};

export const unwrapToValue = <T>(m: Maybe<T>): T | undefined => {
  return m.isSome() ? m.unwrap() : undefined;
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

export const b = (value: any): string => JSON.stringify(value, null, 2);

// FIXME remplace all instance
export const mapo = <V1, V2>(
  vs: Record<string, V1>,
  map: (e: V1) => V2,
): Record<string, V2> =>
  Object.entries(vs).reduce((agg, [key, value]) => {
    agg[key] = map(value);
    return agg;
  }, {} as Record<string, V2>);

export const unparse = (loc: ast.Location): string => {
  return loc.source.body.slice(loc.start, loc.end);
};

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

export function unzip<A, B>(arrays: ([A, B])[]): [A[], B[]] {
  const as: A[] = [];
  const bs: B[] = [];
  arrays.forEach(([a, b]) => {
    as.push(a);
    bs.push(b);
  });
  return [as, bs];
}

export function envOrFail(typegraph: string, name: string): string {
  const envName = `TG_${typegraph}_${name}`.toUpperCase();
  const value = Deno.env.get(envName);
  ensure(
    value != null,
    `cannot find env "${envName}"`,
  );
  return value as string;
}

export const b64decode = (v: string): string => {
  return new TextDecoder().decode(base64.decode(v));
};

export const b64encode = (v: string): string => {
  return base64.encode(v);
};

export type NativeResult<R> = { Ok: R } | { Err: { message: string } };

export function nativeResult<R>(res: NativeResult<R>): R {
  if ("Err" in res) {
    throw new Error(res.Err.message);
  }
  return res.Ok;
}
