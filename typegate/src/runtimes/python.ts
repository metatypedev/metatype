// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { registerRuntime } from "./mod.ts";
import { getLogger } from "../log.ts";
import { Runtime } from "./Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { Materializer } from "../typegraph/types.ts";
import * as ast from "graphql/ast";
import { WitWireMessenger } from "./wit_wire/mod.ts";
import { WitWireMatInfo } from "../../engine/runtime.js";

const _logger = getLogger(import.meta);

@registerRuntime("python")
export class PythonRuntime extends Runtime {
  private constructor(
    typegraphName: string,
    uuid: string,
    private wire: WitWireMessenger,
  ) {
    super(typegraphName, uuid);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers, typegraphName } = params;

    const wireMatInfos = materializers.map((mat) => {
      let matData: object;
      switch (mat.name) {
        case "lambda":
          matData = {
            ty: "lambda",
            source: mat.data.fn as string,
            effect: mat.effect,
          };
          break;
        case "def":
          matData = {
            ty: "def",
            source: mat.data.fn as string,
            func_name: mat.data.name as string,
            effect: mat.effect,
          };
          break;
        /* case "import_function": {
          const pyModMat = typegraph.materializers[mat.data.mod as number];
          const code = pyModMat.data.code as string;
          matData = {
            ty: "import_function",
            source: mat.data.fn as string,
            func_name: mat.data.name as string,
            effect: mat.effect,
          };
          break;
        } */
        default:
          throw new Error(`unsupported materializer type: ${mat.name}`);
      }
      const out: WitWireMatInfo = {
        op_name: mat.data.name as string,
        // TODO: hashing
        mat_hash: mat.data.name as string,
        // TODO: title of materializer type?
        mat_title: mat.data.name as string,
        mat_data_json: JSON.stringify(matData),
      };
      return out;
    });

    // add default vm for lambda/def
    const uuid = crypto.randomUUID();
    const wire = await WitWireMessenger.init(
      "inline://pyrt_wit_wire.cwasm",
      uuid,
      wireMatInfos,
    );

    return new PythonRuntime(typegraphName, uuid, wire);
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
    const { name } = mat.data;
    return (args) => this.wire.handle(name as string, args);
  }
}
