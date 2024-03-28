// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { artifactPath, nativeResult } from "../utils.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { registerRuntime } from "./mod.ts";

@registerRuntime("wasm")
export class WasmRuntime extends Runtime {
  private constructor(typegraphName: string) {
    super(typegraphName);
  }

  static init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraphName } = params;

    return Promise.resolve(new WasmRuntime(typegraphName));
  }

  async deinit(): Promise<void> {
  }

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    if (stage.props.materializer?.data?.mdk_enabled) {
      return this.#mdkResolver(stage);
    }
    return this.#genericWasiResolver(stage);
  }

  #mdkResolver(stage: ComputeStage) {
    const { materializer, argumentTypes, outType } = stage.props;
    const { wasm, func, artifact_hash, tg_name } = materializer?.data ?? {};
    const order = Object.keys(argumentTypes ?? {});

    const resolver: Resolver = async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));
      const { res } = nativeResult(
        await native.wasmedge_mdk(
          {
            func: func as string,
            wasm: artifactPath(
              tg_name as string,
              wasm as string,
              artifact_hash as string,
            ),
            args: transfert,
            out: outType.type,
          },
        ),
      );
      return JSON.parse(res);
    };

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  #genericWasiResolver(stage: ComputeStage) {
    const { materializer, argumentTypes, outType } = stage.props;
    const { wasm, func, artifact_hash, tg_name } = materializer?.data ?? {};
    const order = Object.keys(argumentTypes ?? {});

    // always wasi
    const resolver: Resolver = async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));
      const { res } = nativeResult(
        await native.wasmedge_wasi(
          {
            func: func as string,
            wasm: artifactPath(
              tg_name as string,
              wasm as string,
              artifact_hash as string,
            ),
            args: transfert,
            out: outType.type,
          },
        ),
      );
      return JSON.parse(res);
    };

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }
}
