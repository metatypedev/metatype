// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { RuntimeInitParams } from "../types.ts";
import { registerRuntime } from "./mod.ts";
import { WasmRuntimeData } from "../typegraph/types.ts";
import { WasmRuntimeReflected } from "./wasm/reflected.ts";
import { WasmRuntimeWire } from "./wasm/wire.ts";

@registerRuntime("wasm")
export class WasmRuntime {
  static async init(
    params: RuntimeInitParams<WasmRuntimeData>,
  ): Promise<Runtime> {
    if (params.args.ty == "wire") {
      return await WasmRuntimeWire.init(params.args.wasm_artifact, params);
    } else {
      return WasmRuntimeReflected.init(params.args.wasm_artifact, params);
    }
  }
}
