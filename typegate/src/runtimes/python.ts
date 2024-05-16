// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import { Runtime } from "./Runtime.ts";
import type { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { Artifact, Materializer } from "../typegraph/types.ts";
import * as ast from "graphql/ast";
import { WitWireMessenger } from "./wit_wire/mod.ts";
import { WitWireMatInfo } from "../../engine/runtime.js";
import { sha256 } from "../crypto.ts";

const logger = getLogger(import.meta);

@registerRuntime("python")
export class PythonRuntime extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    uuid: string,
    private wire: WitWireMessenger,
  ) {
    super(typegraphName, uuid);
    this.logger = getLogger(`python:'${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing PythonRuntime");
    logger.debug("init params: " + JSON.stringify(params));
    const { materializers, typegraphName, typegraph, typegate } = params;

    const wireMatInfos = await Promise.all(
      materializers
        .filter((mat) => mat.name != "pymodule")
        .map(
          async (mat) => {
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
                const pyModMat =
                  typegraph.materializers[mat.data.mod as number];

                // resolve the python module artifacts/files
                const { pythonArtifact, depsMeta: depArtifacts } =
                  pyModMat.data;

                console.log({ pyModMat, mat });

                const deps = depArtifacts as Artifact[];
                const artifact = pythonArtifact as Artifact;

                const sources = Object.fromEntries(
                  await Promise.all(
                    [
                      {
                        typegraphName: typegraphName,
                        relativePath: artifact.path,
                        hash: artifact.hash,
                        sizeInBytes: artifact.size,
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
                  root_src_path: artifact.path,
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
            const op_name = `${mat.data.name as string}_${
              dataHash.slice(0, 12)
            }`;

            const out: WitWireMatInfo = {
              op_name,
              mat_hash: dataHash,
              // TODO: source title of materializer type?
              mat_title: mat.data.name as string,
              mat_data_json: JSON.stringify(matInfoData),
            };
            return out;
          },
        ),
    );

    // add default vm for lambda/def
    const uuid = crypto.randomUUID();
    logger.info(
      `initializing WitWireMessenger for PythonRuntime ${uuid} on typegraph ${typegraphName}`,
    );
    const wire = await WitWireMessenger.init(
      "inline://pyrt_wit_wire.cwasm",
      uuid,
      wireMatInfos,
    );
    logger.info("WitWireMessenger initialized");

    return new PythonRuntime(typegraphName, uuid, wire);
  }

  async deinit(): Promise<void> {
    this.logger.info("deinitializing PythonRuntime");
    await using _drop = this.wire;
  }

  async materialize(
    stage: ComputeStage,
    _waitlist: ComputeStage[],
    _verbose: boolean,
  ): Promise<ComputeStage[]> {
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
        stage.withResolver(await this.delegate(mat)),
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

  async delegate(mat: Materializer): Promise<Resolver> {
    const { name } = mat.data;
    const dataHash = await sha256(JSON.stringify(mat.data));
    const op_name = `${name as string}_${dataHash.slice(0, 12)}`;
    return async (args) => {
      this.logger.info(`running '${op_name}'`);
      this.logger.debug(
        `running '${op_name}' with args: ${JSON.stringify(args)}`,
      );
      const res = await this.wire.handle(op_name, args);
      this.logger.info(`'${op_name}' successful`);
      this.logger.debug(`'${op_name}' returned: ${JSON.stringify(res)}`);
      return res;
    };
  }
}
