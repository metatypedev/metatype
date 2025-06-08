// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { registerRuntime } from "./mod.ts";
import { getLogger, type Logger } from "../log.ts";
import { Runtime } from "./Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import type { ComputeStage } from "../engine/query_engine.ts";
import type { Materializer } from "../typegraph/types.ts";
import * as ast from "graphql/ast";
import type { WitWireMatInfo } from "../../engine/runtime.js";
import { sha256 } from "../crypto.ts";
import { TypeGraphDS } from "../typegraph/mod.ts";
import { WorkerManager } from "./wasm/worker_manager.ts";

@registerRuntime("python")
export class PythonRuntime extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    private tg: TypeGraphDS,
    private uuid: string,
    private wireMat: WitWireMatInfo[],
    private workerManager: WorkerManager,
  ) {
    super(typegraphName, uuid);
    this.logger = getLogger(`python:'${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    const { materializers, typegraphName, typegraph, typegate } = params;
    const artifacts = typegraph.meta.artifacts;

    const wireMatInfos = await Promise.all(
      materializers
        .filter((mat) => mat.name != "pymodule")
        .map(async (mat) => {
          let matInfoData: object;
          switch (mat.name) {
            case "lambda":
              matInfoData = {
                ty: "lambda",
                effect: mat.effect,
                source: mat.data.fn as string,
              };
              break;
            case "def":
              matInfoData = {
                ty: "def",
                func_name: mat.data.name as string,
                effect: mat.effect,
                source: mat.data.fn as string,
              };
              break;
            case "import_function": {
              const pyModMat = typegraph.materializers[mat.data.mod as number];

              // resolve the python module artifacts/files
              const entryPoint = artifacts[pyModMat.data.entryPoint as string];
              const deps = (pyModMat.data.deps as string[]).map(
                (dep) => artifacts[dep],
              );

              const sources = Object.fromEntries(
                await Promise.all(
                  [
                    {
                      typegraphName: typegraphName,
                      relativePath: entryPoint.path,
                      hash: entryPoint.hash,
                      sizeInBytes: entryPoint.size,
                    },
                    ...deps.map((dep) => {
                      return {
                        typegraphName: typegraphName,
                        relativePath: dep.path,
                        hash: dep.hash,
                        sizeInBytes: dep.size,
                      };
                    }),
                  ].map(
                    async (meta) =>
                      [
                        meta.relativePath,
                        await Deno.readTextFile(
                          await typegate.artifactStore.getLocalPath(meta),
                        ),
                      ] as const,
                  ),
                ),
              );

              matInfoData = {
                ty: "import_function",
                effect: mat.effect,
                root_src_path: entryPoint.path,
                func_name: mat.data.name as string,
                sources,
              };
              break;
            }
            default:
              throw new Error(`unsupported materializer type: ${mat.name}`);
          }

          // TODO: use materializer type node hash instead
          const dataHash = await sha256(JSON.stringify(mat.data));
          const op_name = `${mat.data.name as string}_${dataHash.slice(0, 12)}`;

          const out: WitWireMatInfo = {
            op_name,
            mat_hash: dataHash,
            // TODO: source title of materializer type?
            mat_title: mat.data.name as string,
            mat_data_json: JSON.stringify(matInfoData),
          };
          return out;
        }),
    );

    // add default vm for lambda/def
    const uuid = crypto.randomUUID();

    const hostcallCtx = {
      typegate,
      typegraphUrl: new URL(
        `internal+hostcall+witwire://typegate/${typegraphName}`,
      ),
    };

    const workerManager = new WorkerManager(hostcallCtx);

    return new PythonRuntime(
      typegraphName,
      typegraph,
      uuid,
      wireMatInfos,
      workerManager,
    );
  }

  deinit() {
    // if (Deno.env.get("KILL_PY")) {
    //   throw new Error("wtf");
    // }
    this.workerManager.deinit();
    this.logger.info("deinitializing PythonRuntime");
    return Promise.resolve();
  }

  async materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): Promise<ComputeStage[]> {
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

      return [stage.withResolver(await this.delegate(mat))];
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

  async delegate(mat: Materializer): Promise<Resolver> {
    const { name } = mat.data;
    const dataHash = await sha256(JSON.stringify(mat.data));
    const opName = `${name as string}_${dataHash.slice(0, 12)}`;
    return async (args) => {
      this.logger.info(`running '${opName}'`);
      this.logger.debug(
        `running '${opName}' with args: ${JSON.stringify(args)}`,
      );
      const res = await this.workerManager.callWitOp({
        opName,
        args,
        ops: this.wireMat,
        id: this.uuid,
        componentPath: "inline://pyrt_wit_wire.cwasm",
      });
      this.logger.info(`'${opName}' successful`);
      this.logger.debug(`'${opName}' returned: ${JSON.stringify(res)}`);
      return res;
    };
  }
}
