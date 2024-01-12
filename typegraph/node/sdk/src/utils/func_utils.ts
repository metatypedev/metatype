// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { InheritDef } from "../typegraph.js";
import { ReducePath } from "../gen/interfaces/metatype-typegraph-utils.js";
import { serializeStaticInjection } from "./injection_utils.js";

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
