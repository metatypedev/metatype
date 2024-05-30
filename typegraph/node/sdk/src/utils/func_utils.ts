// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  InheritDef,
  TgFinalizationResult,
  TypegraphOutput,
} from "../typegraph.js";
import { ReducePath } from "../gen/interfaces/metatype-typegraph-utils.js";
import { serializeStaticInjection } from "./injection_utils.js";
import { ArtifactResolutionConfig } from "../gen/interfaces/metatype-typegraph-core.js";
import { log } from "../log.js";

export function stringifySymbol(symbol: symbol) {
  const name = symbol.toString().match(/\((.+)\)/)?.[1];
  if (!name) {
    throw new Error("unable to determine symbol name");
  }
  return name;
}

export function serializeRecordValues<T>(
  obj: Record<string, T>,
): Array<[string, string]> {
  return Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]);
}

export function buildReduceData(
  node: InheritDef | unknown,
  paths: ReducePath[] = [],
  currPath: string[] = [],
): ReducePath[] {
  if (node === null || node === undefined) {
    throw new Error(
      `unsupported value "${node}" at ${currPath.join(".")}`,
    );
  }
  if (node instanceof InheritDef) {
    paths.push({
      path: currPath,
      value: { inherit: true, payload: node.payload },
    });
    return paths;
  }

  if (typeof node === "object") {
    if (Array.isArray(node)) {
      paths.push({
        path: currPath,
        value: { inherit: false, payload: serializeStaticInjection(node) },
      });
      return paths;
    }
    for (const [k, v] of Object.entries(node)) {
      buildReduceData(v, paths, [...currPath, k]);
    }
    return paths;
  }

  const allowed = ["number", "string", "boolean"];
  if (allowed.includes(typeof node)) {
    paths.push({
      path: currPath,
      value: { inherit: false, payload: serializeStaticInjection(node) },
    });
    return paths;
  }
  throw new Error(
    `unsupported type "${typeof node}" at ${currPath.join(".")}`,
  );
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
  config: ArtifactResolutionConfig,
  tgOutput: TypegraphOutput,
): TypegraphOutput {
  frozenMemo[tgOutput.name] = frozenMemo[tgOutput.name] ??
    tgOutput.serialize(config);
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
    if (response.headers.get("Content-Type") == "application/json") {
      return await response.json();
    }
    throw Error(
      `${errMsg}: expected json object, got "${await response.text()}"`,
    );
  } catch (err) {
    log.debug("fetch error", { url, requestInit: reqInit, error: err });
    const message = err instanceof Error ? err.message : err;
    throw Error(`${errMsg}: ${message}`);
  }
}
