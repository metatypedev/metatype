// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { registerRuntime } from "./mod.ts";
import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import * as ast from "graphql/ast";
import { Materializer, WasmRuntimeData } from "../typegraph/types.ts";
import { getLogger, Logger } from "../log.ts";
import { WitWireMessenger } from "./wit_wire/mod.ts";
import { InternalAuth } from "../services/auth/protocols/internal.ts";

const logger = getLogger(import.meta);

@registerRuntime("wasm_wire")
export class WasmRuntimeWire extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    uuid: string,
    private wire: WitWireMessenger,
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
    logger.debug("initializing wit wire {}", {
      instanceId: uuid,
      module: artifactMeta,
    });

    logger.info("initializing wit wire messenger");
    const token = await InternalAuth.emit(typegate.cryptoKeys);
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
      {
        authToken: token,
        typegate,
        typegraphUrl: new URL(`internal+witwire://typegate/${typegraphName}`),
      },
    );
    logger.info("wit wire messenger initialized");

    return new WasmRuntimeWire(typegraphName, uuid, wire);
  }

  async deinit(): Promise<void> {
    this.logger.info("deinitializing WasmRuntimeWire");
    await using _drop = this.wire;
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

    if (stage.props.outType.config?.__namespace) {
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
    return (args) => {
      this.logger.info(`running '${op_name}'`);
      this.logger.debug(`running '${op_name}' with args: {}`, args);

      const res = this.wire.handle(op_name as string, args);

      this.logger.info(`'${op_name}' successful`);
      this.logger.debug(`'${op_name}' returned: ${JSON.stringify(res)}`);

      return res;
    };
  }
}
