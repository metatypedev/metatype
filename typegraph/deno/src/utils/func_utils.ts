// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ApplyTree } from "./type_utils.ts";
import { Typedef } from "../types.ts";

export function serializeRecordValues<T>(
  obj: Record<string, T>,
): Array<[string, string]> {
  return Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]);
}

export function asApplyValue(node: any, path: string[] = []): ApplyTree {
  if (node === null || node === undefined) {
    throw new Error(
      `unsupported value "${node}" at ${path.join(".")}`,
    );
  }
  if (node instanceof Typedef) {
    return { id: node._id };
  }
  if (typeof node === "object") {
    if (Array.isArray(node)) {
      return { set: node };
    }
    const newObj = {} as any;
    for (const [k, v] of Object.entries(node)) {
      newObj[k] = asApplyValue(v, [...path, k]);
    }
    return newObj;
  }
  const allowed = ["number", "string", "boolean"];
  if (allowed.includes(typeof node)) {
    return { set: node };
  }
  throw new Error(
    `unsupported type "${typeof node}" at ${path.join(".")}`,
  );
}
