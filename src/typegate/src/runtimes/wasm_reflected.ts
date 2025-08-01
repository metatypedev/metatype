// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { registerRuntime } from "./mod.ts";
import { Runtime } from "./Runtime.ts";
import * as native from "native";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import { nativeResult } from "../utils.ts";
import type { ComputeStage } from "../engine/query_engine.ts";
import * as ast from "graphql/ast";
import type { Materializer, WasmRuntimeData } from "../typegraph/types.ts";
import type { Typegate } from "../typegate/mod.ts";
import { getLogger, type Logger } from "../log.ts";
import type { TypeGraphDS } from "../typegraph/mod.ts";

const logger = getLogger(import.meta);

@registerRuntime("wasm_reflected")
export class WasmRuntimeReflected extends Runtime {
  private logger: Logger;

  private constructor(
    public artifactKey: string,
    typegraphName: string,
    private tg: TypeGraphDS,
    private typegate: Typegate,
  ) {
    super(typegraphName);
    this.logger = getLogger(`wasm_reflected:'${typegraphName}'`);
  }

  static init(params: RuntimeInitParams<WasmRuntimeData>): Runtime {
    logger.info("initializing WasmRuntimeReflected");
    const { typegraphName, typegraph, typegate, args: { wasm_artifact } } =
      params;
    return new WasmRuntimeReflected(
      wasm_artifact,
      typegraphName,
      typegraph,
      typegate,
    );
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
              logger.error(
                `Unsupported operation type '${stage.props.operationType}'`,
              );
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

    if (this.tg.meta.namespaces!.includes(stage.props.typeIdx)) {
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
    const art = typegraph.tg.tg.meta.artifacts[this.artifactKey as string];

    const artifactMeta = {
      typegraphName: this.typegraphName,
      relativePath: art.path,
      hash: art.hash,
      sizeInBytes: art.size,
    };

    return async (args) => {
      this.logger.info(`wit call '${op_name}'`);
      const transfert = order.map((k) => JSON.stringify(args[k]));
      const { res } = nativeResult(
        await native.wasmtime_wit({
          func: op_name as string,
          wasm: await this.typegate.artifactStore.getLocalPath(artifactMeta),
          args: transfert,
        }),
      );
      this.logger.info(`wit call '${op_name}' successful`);
      this.logger.debug(`wit call result '${op_name}': ${res}`);
      return JSON.parse(res);
    };
  }
}
