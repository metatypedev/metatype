// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult } from "../utils.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { registerRuntime } from "./mod.ts";
import config from "../config.ts";
import * as ast from "graphql/ast";
import { Materializer } from "../typegraph/types.ts";

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
    if (stage.props.node === "__typename") {
      return [stage.withResolver(() => {
        const { parent: parentStage } = stage.props;
        if (parentStage != null) {
          return parentStage.props.outType.title;
        }
        switch (stage.props.operationType) {
          case ast.OperationTypeNode.QUERY:
            return "Query";
          case ast.OperationTypeNode.MUTATION:
            return "Mutation";
          default:
            throw new Error(
              `Unsupported operation type '${stage.props.operationType}'`,
            );
        }
      })];
    }

    if (stage.props.materializer != null) {
      const { materializer, argumentTypes, outType: _ } = stage.props;
      return [
        stage.withResolver(this.#witResolver(materializer, argumentTypes)),
      ];
    }

    if (stage.props.outType.config?.__namespace) {
      return [stage.withResolver(() => ({}))];
    }

    return [stage.withResolver(({ _: { parent } }) => {
      if (stage.props.parent == null) { // namespace
        return {};
      }
      const resolver = parent[stage.props.node];
      return typeof resolver === "function" ? resolver() : resolver;
    })];
  }

  #witResolver(
    materializer: Materializer,
    argumentTypes?: Record<string, string>,
  ): Resolver {
    const { wasm, func, artifact_hash, tg_name } = materializer?.data ?? {};
    const order = Object.keys(argumentTypes ?? {});

    return async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));
      const { res } = nativeResult(
        await native.wasmtime_wit(
          {
            func: func as string,
            wasm:
              `${config.tmp_dir}/metatype_artifacts/${tg_name as string}/artifacts/${wasm as string}.${artifact_hash as string}`,
            args: transfert,
          },
        ),
      );
      return JSON.parse(res);
    };
  }
}
