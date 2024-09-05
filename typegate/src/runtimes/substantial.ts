// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph, TypeMaterializer } from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import * as native from "native";
import * as ast from "graphql/ast";
import { nativeResult } from "../utils.ts";
import { WorkerManager } from "./substantial/workflow_worker_manager.ts";
import { path } from "compress/deps.ts";
import { Artifact, Materializer } from "@typegate/typegraph/types.ts";
import { Typegate } from "@typegate/typegate/mod.ts";
import {
  Interrupt,
  Result,
  WorkerData,
  WorkflowResult,
} from "@typegate/runtimes/substantial/types.ts";

const logger = getLogger(import.meta);

type QueryWorkflowResult = {
  run_id: string;
  started_at: string;
  ended_at: string;
  result: {
    status: "ABORTED" | "COMPLETED" | "COMPLETED_WITH_ERROR" | "UNKNOWN";
    value: unknown; // hinted by the user
  };
};

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: native.Backend;
  private workerManager: WorkerManager;
  private workflowFiles: Map<string, string> = new Map();
  private workflowResults: Map<string, Array<QueryWorkflowResult>> = new Map();

  private constructor(
    typegraphName: string,
    backend: native.Backend,
    workerManager: WorkerManager,
  ) {
    super(typegraphName);
    this.logger = getLogger(`substantial:'${typegraphName}'`);
    this.backend = backend;
    this.workerManager = workerManager;
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing SubstantialRuntime");
    logger.debug(`init params: ${JSON.stringify(params)}`);
    const {
      typegraph: tg,
      args,
      materializers,
      secretManager,
      typegate,
    } = params;

    const secrets: Record<string, string> = {};

    for (const m of materializers) {
      for (const secretName of (m.data.secrets as []) ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }

    const tgName = TypeGraph.formatName(tg);
    const backend = (args as any)!.backend as native.Backend;
    const workerManager = WorkerManager.getInstance();

    const instance = new SubstantialRuntime(tgName, backend, workerManager);

    await instance.#prepareWorkflowFiles(
      tg.meta.artifacts,
      materializers,
      typegate,
    );

    return instance;
  }

  deinit(): Promise<void> {
    logger.info("deinitializing SubstantialRuntime");
    this.workerManager.destroyAllWorkers();
    return Promise.resolve();
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

    if (stage.props.outType.config?.__namespace) {
      return [stage.withResolver(() => ({}))];
    }

    if (stage.props.materializer != null) {
      return [stage.withResolver(this.#delegate(stage.props.materializer))];
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

  #delegate(mat: TypeMaterializer): Resolver {
    const name = mat.name;
    const data = mat?.data ?? {};
    const workflowName = data.name as string;

    switch (name) {
      case "start":
        return this.#startResolver(workflowName);
      case "stop":
        return ({ run_id }) => {
          this.workerManager.triggerStop(run_id);
          return run_id;
        };
      case "event":
        return ({ run_id }) => {
          this.workerManager.trigger("SEND", run_id, data);
        };
      case "ressources":
        return () => {
          const res = this.workerManager.getAllocatedRessources(workflowName);
          return JSON.parse(JSON.stringify(res));
        };
      case "results":
        return () => {
          return this.workflowResults.get(workflowName) ?? [];
        };
      default:
        return () => null;
    }
  }

  #startResolver(workflowName: string): Resolver {
    return ({ kwargs }) => {
      const modPath = this.#getModPath(workflowName);
      const runId = WorkerManager.nextId(workflowName);

      const { run } = nativeResult(
        native.createOrGetRun({
          backend: this.backend,
          run_id: runId,
        }),
      );

      this.workerManager.triggerStart(
        workflowName,
        runId,
        modPath,
        run,
        kwargs,
      );
      this.workerManager.listen(
        runId,
        this.#eventResultHandlerFor(workflowName, runId),
      );

      return runId;
    };
  }

  async #prepareWorkflowFiles(
    artifacts: Record<string, Artifact>,
    materializers: Materializer[],
    typegate: Typegate,
  ) {
    const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");

    for (const mat of materializers) {
      if (
        !["start", "stop", "send", "ressources", "results"].includes(mat.name)
      ) {
        continue;
      }

      const entryModulePath = await this.#getWorkflowEntryPointPath(
        artifacts,
        mat.data,
        typegate,
      );

      const { name: workflowName } = mat.data;
      this.workflowFiles.set(workflowName as string, entryModulePath);
      this.workflowResults.set(workflowName as string, []);
      logger.info(`Resolved runtime artifacts at ${basePath}`);
    }
  }

  async #getWorkflowEntryPointPath(
    artifacts: Record<string, Artifact>,
    matData: Record<string, unknown>,
    typegate: Typegate,
  ) {
    const entryPoint = artifacts[matData.file as string];
    const deps = (matData.deps as string[]).map((dep) => artifacts[dep]);
    const moduleMeta = {
      typegraphName: this.typegraphName,
      relativePath: entryPoint.path,
      hash: entryPoint.hash,
      sizeInBytes: entryPoint.size,
    };
    const depMetas = deps.map((dep) => {
      return {
        typegraphName: this.typegraphName,
        relativePath: dep.path,
        hash: dep.hash,
        sizeInBytes: dep.size,
      };
    });

    return await typegate.artifactStore.getLocalPath(moduleMeta, depMetas);
  }

  #eventResultHandlerFor(workflowName: string, runId: string) {
    return (result: Result<unknown>) => {
      if (result.error) {
        // TODO: better way to notify back through gql
        // All Worker/Runner level issue falls here
        logger.error(
          `result error for "${runId}": ${JSON.stringify(result.payload)}`,
        );
        return;
      }

      const answer = result.payload as WorkerData;
      logger.info(`"${runId}" answered with: ${JSON.stringify(answer)}`);

      const startedAt = this.workerManager.getTimeStartedAt(runId);

      const backend = this.backend;
      switch (answer.type) {
        case "START": {
          const ret = answer.data as WorkflowResult;
          const _run = nativeResult(
            native.persistRun({
              backend,
              run: ret.run,
            }),
          );

          if (Interrupt.getTypeOf(ret.exception) != null) {
            const deferMs = 3000;
            setTimeout(() => {
              this.workerManager.destroyWorker(workflowName, runId); // !

              logger.warn(
                `Interrupt "${workflowName}": ${ret.result}, relaunching under "${runId}"`,
              );
              this.workerManager.triggerStart(
                workflowName,
                runId,
                this.#getModPath(workflowName),
                ret.run,
                ret.run.operations[0],
              );
              this.workerManager.listen(
                runId,
                this.#eventResultHandlerFor(workflowName, runId),
              );
            }, deferMs);
          } else {
            this.workerManager.destroyWorker(workflowName, runId); // !

            logger.info(
              `gracefull completion of "${runId}": ${
                JSON.stringify(
                  ret.result,
                )
              }`,
            );

            this.#addResult(workflowName, {
              run_id: runId,
              started_at: startedAt.toJSON(),
              ended_at: new Date().toJSON(),
              result: {
                status: ret.kind == "FAIL"
                  ? "COMPLETED_WITH_ERROR"
                  : "COMPLETED",
                value: ret.result, // hinted by the user
              },
            });
          }

          break;
        }
        case "SEND": {
          logger.info(`event sent "${runId}": ${JSON.stringify(answer.data)}`);
          break;
        }
        case "STOP": {
          logger.warn(
            `forcefully stopped "${runId}": ${JSON.stringify(answer.data)}`,
          );

          this.#addResult(workflowName, {
            run_id: runId,
            started_at: startedAt.toJSON(),
            ended_at: new Date().toJSON(),
            result: {
              status: "ABORTED",
              value: null,
            },
          });

          this.workerManager.destroyWorker(workflowName, runId); // !
          break;
        }
        default:
          logger.error(
            `Invalid type ${answer.type} send by "${runId}": ${
              JSON.stringify(
                answer.data,
              )
            }`,
          );
      }
    };
  }

  #addResult(workflowName: string, result: QueryWorkflowResult) {
    this.workflowResults.get(workflowName)!.push(result);
  }

  #getModPath(workflowName: string) {
    const modPath = this.workflowFiles.get(workflowName);
    if (!modPath) {
      throw new Error(`Fatal: cannot find workflow file for "${workflowName}"`);
    }
    return modPath;
  }
}
