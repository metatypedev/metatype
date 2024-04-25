// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "../Runtime.ts";
import { Resolver, RuntimeInitParams } from "../../types.ts";
import { ComputeStage } from "../../engine/query_engine.ts";
import * as ast from "graphql/ast";
import { Materializer } from "../../typegraph/types.ts";
import type { WitWireMatInfo } from "../../../engine/runtime.js";
import { ResolverArgs } from "../../types.ts";

export class WasmRuntimeWire extends Runtime {
  private constructor(
    typegraphName: string,
    uuid: string,
    private wire: WitWireMessenger,
  ) {
    super(typegraphName, uuid);
  }

  static async init(
    modulePath: string,
    params: RuntimeInitParams,
  ): Promise<Runtime> {
    const { materializers, typegraphName, typegraph, typegate } = params;

    const moduleArt = typegraph.meta.artifacts[modulePath];
    const artifactMeta = {
      typegraphName: typegraphName,
      relativePath: moduleArt.path,
      hash: moduleArt.hash,
      sizeInBytes: moduleArt.size,
    };

    const uuid = crypto.randomUUID();
    const wire = await WitWireMessenger.init(
      await typegate.artifactStore.getLocalPath(artifactMeta),
      uuid,
      materializers.map((mat) => ({
        op_name: mat.data.func as string,
        // TODO; appropriately source the following
        mat_hash: mat.data.func as string,
        mat_title: mat.data.func as string,
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
    const { name } = mat.data;
    return (args) => this.wire.handle(name as string, args);
  }
}

export class WitWireMessenger {
  static async init(componentPath: string, id: string, ops: WitWireMatInfo[]) {
    try {
      const _res = await Meta.wit_wire.init(componentPath, id, {
        expected_ops: ops,
        metatype_version: "TODO",
      });
      return new WitWireMessenger(id);
    } catch (err) {
      throw new Error(`error on init for component at path: ${componentPath}`, {
        cause: {
          componentPath,
          ops,
          err,
        },
      });
    }
  }

  constructor(public id: string) {
  }

  async [Symbol.asyncDispose]() {
    await Meta.wit_wire.destroy(this.id);
  }

  async handle(opName: string, args: ResolverArgs) {
    const { _, ...inJson } = args;
    try {
      const res = await Meta.wit_wire.handle(this.id, {
        op_name: opName,
        in_json: JSON.stringify(inJson),
      });
      return JSON.parse(res);
    } catch (err) {
      throw new Error(`error handling request for op ${opName}`, {
        cause: {
          opName,
          args,
          err,
        },
      });
    }
  }
}
