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
  fields: string[]
) => {
  return fields.reduce((agg, f) => ({ ...agg, [f]: obj[f] }), {});
};

export const b = (value: any): string => JSON.stringify(value, null, 2);

// FIXME remplace all instance
export const mapo = <V1, V2>(
  vs: Record<string, V1>,
  map: (e: V1) => V2
): Record<string, V2> =>
  Object.entries(vs).reduce((agg, [key, value]) => {
    agg[key] = map(value);
    return agg;
  }, {} as Record<string, V2>);
