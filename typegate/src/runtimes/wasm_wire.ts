// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { registerRuntime } from "./mod.ts";
import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import * as ast from "graphql/ast";
import { Materializer, WasmRuntimeData } from "../typegraph/types.ts";
import { getLogger } from "../log.ts";
import { WitWireMessenger } from "./wit_wire/mod.ts";

const logger = getLogger(import.meta);

@registerRuntime("wasm_wire")
export class WasmRuntimeWire extends Runtime {
  private constructor(
    typegraphName: string,
    uuid: string,
    private wire: WitWireMessenger,
  ) {
    super(typegraphName, uuid);
  }

  static async init(
    params: RuntimeInitParams<WasmRuntimeData>,
  ): Promise<Runtime> {
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
    logger.debug("initializing wit wire {}", {
      instanceId: uuid,
      module: artifactMeta,
    });
    const wire = await WitWireMessenger.init(
      await typegate.artifactStore.getLocalPath(artifactMeta),
      uuid,
      materializers.map((mat) => ({
        op_name: mat.data.op_name as string,
        // TODO; appropriately source the following
        mat_hash: mat.data.op_name as string,
        mat_title: mat.data.op_name as string,
        mat_data_json: JSON.stringify({}),
      })),
    );

    return new WasmRuntimeWire(typegraphName, uuid, wire);
  }

  async deinit(): Promise<void> {
    await using _drop = this.wire;
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
      const mat = stage.props.materializer;
      return [
        stage.withResolver(this.delegate(mat)),
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

  delegate(mat: Materializer): Resolver {
    const { op_name } = mat.data;
    return (args) => this.wire.handle(op_name as string, args);
  }
}
