// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export type Runtime = "node" | "deno"; // | "bun";

export function getRuntime() {
  const glob = globalThis as any;
  if (glob?.process.env) {
    return "node";
  }
  if (glob?.Deno.env) {
    return "deno";
  }
  // TODO: bun?
  throw new Error("Unsupported Runtime");
}

const loaderCache = new Map();

export async function dir(root: string): Promise<Array<string>> {
  const runtimeName = getRuntime();
  switch (runtimeName) {
    case "node":
      const importName = "readdirSync";
      let readdirSync = async (_: string) => [] as Array<string>;
      if (!loaderCache.has(importName)) {
        // FIXME: is there a way to de-async this?
        readdirSync = async (path: string) =>
          (await import("node:fs"))[importName]!(path);
        loaderCache.set(importName, readdirSync);
      } else {
        readdirSync = loaderCache.get(importName);
      }
      return readdirSync(root);
    case "deno":
      const deno = (globalThis as any).Deno as any;
      return Array.from(deno.readDirSync(root)).map((e) => (e as any).name);
    default:
      throw new Error(`No handler for runtime ${runtimeName}`);
  }
}
