// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { dirname, fromFileUrl, resolve } from "std/path/mod.ts";
import { Runtime } from "./Runtime.ts";
import { RuntimeInit, RuntimeInitParams } from "../types.ts";

const localDir = dirname(fromFileUrl(import.meta.url));

const registeredRuntimes: Map<string, RuntimeInit> = new Map();

interface RegistrableRuntime {
  init(params: RuntimeInitParams): Promise<Runtime> | Runtime;
}

export function registerRuntime<
  T extends RegistrableRuntime,
>(
  name: string,
): (runtime: T) => void {
  return (runtime: T) => {
    if (registeredRuntimes.has(name)) {
      throw new Error(`Runtime ${name} is already registered`);
    }
    registeredRuntimes.set(name, runtime.init);
  };
}

export async function initRuntime(
  name: string,
  params: RuntimeInitParams,
): Promise<Runtime> {
  const init = registeredRuntimes.get(name);
  if (!init) {
    throw new Error(`Runtime ${name} is not registered`);
  }
  return await init(params);
}

export async function init_runtimes(): Promise<void> {
  for await (const file of Deno.readDir(localDir)) {
    if (file.isFile && file.name.endsWith(".ts") && file.name !== "mod.ts") {
      await import(resolve(localDir, file.name));
    }
  }
}
