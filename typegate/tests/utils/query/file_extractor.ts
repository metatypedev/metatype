// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Variables } from "./mod.ts";

export class FileExtractor {
  private map: Map<File, string[]> = new Map();

  private addFile(file: File, path: string) {
    if (this.map.has(file)) {
      this.map.get(file)!.push(path);
    } else {
      this.map.set(file, [path]);
    }
  }

  private traverse(
    parent: Array<unknown> | Record<string, unknown>,
    field: string | number,
    parentPath: string,
  ) {
    const path = `${parentPath}.${field}`;
    const value = (parent as Record<string | number, unknown>)[field];
    if (typeof value === "object" && value != null) {
      if (value instanceof File) {
        (parent as Record<string | number, unknown>)[field] = null;
        this.addFile(value, path);
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; ++i) {
          this.traverse(value, i, path);
        }
      } else {
        for (const key of Object.keys(value)) {
          this.traverse(value as Record<string, unknown>, key, path);
        }
      }
    }
  }

  extractFilesFromVars(variables: Variables): Map<File, string[]> {
    for (const key of Object.keys(variables)) {
      this.traverse(variables, key, "variables");
    }
    return this.map;
  }
}
