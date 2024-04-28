// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "../Runtime.ts";
import * as native from "native";
import { Resolver, RuntimeInitParams } from "../../types.ts";
import { nativeResult } from "../../utils.ts";
import { ComputeStage } from "../../engine/query_engine.ts";
import * as ast from "graphql/ast";
import { Materializer } from "../../typegraph/types.ts";
import { Typegate } from "../../typegate/mod.ts";

export class WasmRuntimeReflected extends Runtime {
  private constructor(
    public modulePath: string,
    typegraphName: string,
    private typegate: Typegate,
  ) {
    super(typegraphName);
  }

  static init(
    modulePath: string,
    params: RuntimeInitParams,
  ): Runtime {
    const { typegraphName, typegate } = params;
    return new WasmRuntimeReflected(modulePath, typegraphName, typegate);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    if (stage.props.node === "__typename") {
      return [
        stage.withResolver(() => {
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
        }),
      ];
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

    // const _sameRuntime = Runtime.collectRelativeStages(stage, _waitlist);

    return [
      stage.withResolver(({ _: { parent } }) => {
        if (stage.props.parent == null) {
          // namespace
          return {};
        }
        const resolver = parent[stage.props.node];
        return typeof resolver === "function" ? resolver() : resolver;
      }),
    ];
  }

  #witResolver(
    materializer: Materializer,
    argumentTypes?: Record<string, string>,
  ): Resolver {
    const { op_name } = materializer?.data ?? {};
    const order = Object.keys(argumentTypes ?? {});
    const typegraph = this.typegate.register.get(this.typegraphName)!;
    const art = typegraph.tg.tg.meta.artifacts[this.modulePath as string];

    const artifactMeta = {
      typegraphName: this.typegraphName,
      relativePath: art.path,
      hash: art.hash,
      sizeInBytes: art.size,
    };

    return async (args) => {
      const transfert = order.map((k) => JSON.stringify(args[k]));
      const { res } = nativeResult(
        await native.wasmtime_wit({
          func: op_name as string,
          wasm: await this.typegate.artifactStore.getLocalPath(artifactMeta),
          args: transfert,
        }),
      );
      console.log("OUTPUT", res);
      return JSON.parse(res);
    };
  }
}
