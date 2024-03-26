// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult } from "../utils.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { registerRuntime } from "./mod.ts";
import { Typegate } from "../typegate/mod.ts";
import { Artifact } from "../typegraph/types.ts";

@registerRuntime("wasmedge")
export class WasmEdgeRuntime extends Runtime {
  private constructor(typegraphName: string, private typegate: Typegate) {
    super(typegraphName);
  }

  static init(params: RuntimeInitParams): Promise<Runtime> {
    const { typegraphName, typegate } = params;

    return Promise.resolve(new WasmEdgeRuntime(typegraphName, typegate));
  }

  async deinit(): Promise<void> {
  }

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const { materializer, argumentTypes, outType } = stage.props;
    console.log("materializer", materializer);
    const { wasmArtifact, func } = materializer?.data ?? {};
    const order = Object.keys(argumentTypes ?? {});

    const art = wasmArtifact as Artifact;
    const artifactMeta = {
      typegraphName: this.typegraphName,
      relativePath: art.path,
      hash: art.hash,
      sizeInBytes: art.size,
    };

    // always wasi
    const resolver: Resolver = async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));

      const { res } = nativeResult(
        await native.wasmedge_wasi(
          {
            func: func as string,
            wasm: await this.typegate.artifactStore.getLocalPath(artifactMeta),
            args: transfert,
            out: outType.type,
          },
        ),
      );
      return JSON.parse(res);
    };

    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
      ...sameRuntime.map((s) =>
        s.withResolver(Runtime.resolveFromParent(s.props.node))
      ),
    ];
  }
}
