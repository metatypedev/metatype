import { Ctx, GraphQlTransportOptions, QueryGraph, Transports } from "./fdk.ts";

export function dbg<T>(val: T, ...ctx: unknown[]) {
  console.error("DBG", val, ...ctx);
  return val;
}

// TODO: add to metagen or imporove flag format
export function selectAll() {
  return { _: "selectAll" as const };
}

export function assertStringField<
  K extends string | number | symbol,
  O extends Record<K, string>,
>(object: O, key: K) {
  const value = object[key];
  if (value === undefined) {
    throw Error(`value ${String(key)} was undefined`);
  }
  if (value === null) {
    throw Error(`value ${String(key)} was null`);
  }
  return value;
}

// FIXME: #686 remove when hostcall transport lands
export function tgUrl() {
  return "http://localhost:7890/vivavox";
}

export function initClient(bearer: string, options: GraphQlTransportOptions = {}) {
  const qg = new QueryGraph();
  const gql = Transports.graphql(qg, tgUrl(), {
    headers: {
      Authorization: `Bearer ${bearer}`,
    },
    ...options,
  });
  return { qg, gql };
}
