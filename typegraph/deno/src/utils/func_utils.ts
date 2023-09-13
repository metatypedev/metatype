// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { InheritDef } from "../typegraph.ts";
import { ApplyPath } from "../../gen/exports/metatype-typegraph-utils.d.ts";
import { serializeStaticInjection } from "./injection_utils.ts";

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

export function buildApplyData(
  node: InheritDef | unknown,
  paths: ApplyPath[] = [],
  currPath: string[] = [],
): ApplyPath[] {
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
      buildApplyData(v, paths, [...currPath, k]);
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
