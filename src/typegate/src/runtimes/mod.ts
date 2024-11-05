// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Runtime } from "./Runtime.ts";
import type { RuntimeInit, RuntimeInitParams } from "../types.ts";

const registeredRuntimes: Map<string, RuntimeInit> = new Map();

interface RegistrableRuntime {
  init(params: RuntimeInitParams): Promise<Runtime> | Runtime;
}

export function registerRuntime<T extends RegistrableRuntime>(
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
  await Promise.all([
    import("./deno.ts"),
    import("./graphql.ts"),
    import("./http.ts"),
    import("./prisma.ts"),
    import("./python.ts"),
    import("./random.ts"),
    import("./s3.ts"),
    import("./temporal.ts"),
    import("./typegate.ts"),
    import("./typegraph.ts"),
    import("./wasm_wire.ts"),
    import("./wasm_reflected.ts"),
    import("./kv.ts"),
    import("./grpc.ts"),
    import("./substantial.ts"),
  ]);
}
