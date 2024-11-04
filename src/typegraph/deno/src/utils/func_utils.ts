// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  InheritDef,
  TgFinalizationResult,
  TypegraphOutput,
} from "../typegraph.ts";
import { ReduceEntry } from "../gen/utils.ts";
import { serializeStaticInjection } from "./injection_utils.ts";
import { SerializeParams } from "../gen/core.ts";
import { log } from "../io.ts";
import { core } from "../sdk.ts";

export function stringifySymbol(symbol: symbol): string {
  const name = symbol.toString().match(/\((.+)\)/)?.[1];
  if (!name) {
    throw new Error("unable to determine symbol name");
  }
  return name;
}

export type ConfigSpec =
  | Record<string, unknown>
  | Array<string | Record<string, unknown>>;

export function serializeConfig(config: ConfigSpec | undefined): string | null {
  if (!config) {
    return null;
  }
  const array = Array.isArray(config) ? config : [config];
  if (array.length === 0) {
    return null;
  }
  return JSON.stringify(
    array.reduce<Record<string, unknown>>(
      (acc, item) => {
        if (typeof item === "string") {
          return { ...acc, [item]: true };
        } else {
          return { ...acc, ...item };
        }
      },
      {} as Record<string, unknown>,
    ),
  );
}

export type AsIdField = boolean | "simple" | "composite";
export interface Base {
  config?: ConfigSpec;
  name?: string;
}
export interface BaseEx extends Base {
  asId?: AsIdField;
}

function withConfig(id: number, config: ConfigSpec | undefined): number {
  if (!config) {
    return id;
  }
  const serialized = serializeConfig(config);
  if (!serialized) {
    return id;
  }
  return core.withConfig(id, serialized);
}

export function withBase(id: number, base: BaseEx): number {
  let newId = id;
  if (base.asId) {
    newId = core.asId(newId, base.asId === "composite");
  }
  if (base.config) {
    newId = withConfig(newId, base.config);
  }
  if (base.name) {
    newId = core.renameType(newId, base.name);
  }
  return newId;
}

export function serializeRecordValues<T>(
  obj: Record<string, T>,
): Array<[string, string]> {
  return Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]);
}

export function buildReduceEntries(
  node: InheritDef | unknown,
  entries: ReduceEntry[] = [],
  currPath: string[] = [],
): ReduceEntry[] {
  if (node === null || node === undefined) {
    throw new Error(`unsupported value "${node}" at ${currPath.join(".")}`);
  }
  if (node instanceof InheritDef) {
    if (!node.payload) {
      return entries;
    }
    entries.push({
      path: currPath,
      injectionData: node.payload,
    });
    return entries;
  }

  if (typeof node === "object") {
    if (Array.isArray(node)) {
      entries.push({
        path: currPath,
        injectionData: serializeStaticInjection(node),
      });
      return entries;
    }
    for (const [k, v] of Object.entries(node)) {
      buildReduceEntries(v, entries, [...currPath, k]);
    }
    return entries;
  }

  const allowed = ["number", "string", "boolean"];
  if (allowed.includes(typeof node)) {
    entries.push({
      path: currPath,
      injectionData: serializeStaticInjection(node),
    });
    return entries;
  }
  throw new Error(`unsupported type "${typeof node}" at ${currPath.join(".")}`);
}

export function getEnvVariable(
  key: string,
  defaultValue?: string,
): string | undefined {
  const glob = globalThis as any;
  const value = glob?.process
    ? glob?.process.env?.[key]
    : glob?.Deno.env.get(key);
  return value ?? defaultValue;
}

export function getAllEnvVariables(): any {
  const glob = globalThis as any;
  return glob?.process ? glob?.process.env : glob?.Deno.env.toObject();
}

const frozenMemo: Record<string, TgFinalizationResult> = {};

/** Create a reusable version of a `TypegraphOutput` */
export function freezeTgOutput(
  config: SerializeParams,
  tgOutput: TypegraphOutput,
): TypegraphOutput {
  frozenMemo[tgOutput.name] =
    frozenMemo[tgOutput.name] ?? tgOutput.serialize(config);
  return {
    ...tgOutput,
    serialize: () => frozenMemo[tgOutput.name],
  };
}

/**
 * Simple fetch wrapper with more verbose errors
 */
export async function execRequest(
  url: URL,
  reqInit: RequestInit,
  errMsg: string,
) {
  try {
    const response = await fetch(url, reqInit);
    if (!response.ok) {
      log.error(
        "error response json",
        await response.json().catch((_err) => "non json response"),
      );
      throw Error(
        `${errMsg}: request failed with status ${response.status} (${response.statusText})`,
      );
    }

    if (response.headers.get("Content-Type") == "application/json") {
      return await response.json();
    }
    log.error("non json response", response);
    throw Error(
      `${errMsg}: expected json object, got "${await response.text()}"`,
    );
  } catch (err) {
    log.debug("fetch error", { url, requestInit: reqInit, error: err });
    const message = err instanceof Error ? err.message : err;
    throw Error(`${errMsg}: ${message}`);
  }
}
