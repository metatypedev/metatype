import { ComputeStage } from "./engine.ts";
import * as ast from "graphql_ast";

// FIXME replace with monads
export type Maybe<T> = null | undefined | T;
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

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
