// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { registerRuntime } from "./mod.ts";
import { Runtime } from "./Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import type { ComputeStage } from "../engine/query_engine.ts";
import * as ast from "graphql/ast";
import type { Materializer, WasmRuntimeData } from "../typegraph/types.ts";
import { getLogger, type Logger } from "../log.ts";
import type { TypeGraphDS } from "../typegraph/mod.ts";
import type { WitWireMatInfo } from "../../engine/runtime.js";
import { WorkerManager } from "./wasm/worker_manager.ts";

const logger = getLogger(import.meta);

@registerRuntime("wasm_wire")
export class WasmRuntimeWire extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    private tg: TypeGraphDS,
    private uuid: string,
    private componentPath: string,
    private wireMat: WitWireMatInfo[],
    private workerManager: WorkerManager,
  ) {
    super(typegraphName, uuid);
    this.logger = getLogger(`wasm_wire:'${typegraphName}'`);
  }

  static async init(
    params: RuntimeInitParams<WasmRuntimeData>,
  ): Promise<Runtime> {
    logger.info("initializing WasmRuntimeWire");

    const {
      typegraph,
      typegraphName,
      typegate,
      args: { wasm_artifact },
      materializers,
    } = params;

    const moduleArt = typegraph.meta.artifacts[wasm_artifact];
    const artifactMeta = {
      typegraphName: typegraphName,
      relativePath: moduleArt.path,
      hash: moduleArt.hash,
      sizeInBytes: moduleArt.size,
    };

    const uuid = crypto.randomUUID();
    const componentPath = await typegate.artifactStore.getLocalPath(
      artifactMeta,
    );

    const wireMat = materializers.map((mat) => ({
      op_name: mat.data.op_name as string,
      // TODO; appropriately source the following
      mat_hash: mat.data.op_name as string,
      mat_title: mat.data.op_name as string,
      mat_data_json: JSON.stringify({}),
    }));

    const hostcallCtx = {
      typegate,
      typegraphUrl: new URL(
        `internal+hostcall+witwire://typegate/${typegraphName}`,
      ),
    };

    const workerManager = new WorkerManager(hostcallCtx);

    return new WasmRuntimeWire(
      typegraphName,
      typegraph,
      uuid,
      componentPath,
      wireMat,
      workerManager,
    );
  }

  async deinit() {
    await this.workerManager.deinit();
    this.logger.info("deinitializing WasmRuntimeWire");
  }

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
      const mat = stage.props.materializer;
      return [stage.withResolver(this.delegate(mat))];
    }

    if (this.tg.meta.namespaces!.includes(stage.props.typeIdx)) {
      return [stage.withResolver(() => ({}))];
    }

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

  delegate(mat: Materializer): Resolver {
    const { op_name } = mat.data;
    return async (args) => {
      this.logger.info(`running '${op_name}'`);
      this.logger.debug(`running '${op_name}' with args: {}`, args);

      const res = await this.workerManager.callWitOp({
        opName: op_name as string,
        args,
        ops: this.wireMat,
        id: this.uuid,
        componentPath: this.componentPath,
      });

      this.logger.info(`'${op_name}' successful`);
      this.logger.debug(`'${op_name}' returned: ${JSON.stringify(res)}`);

      return res;
    };
  }
}
