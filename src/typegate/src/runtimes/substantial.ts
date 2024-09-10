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
import { nativeResult, sleep } from "../utils.ts";
import { WorkerManager } from "./substantial/workflow_worker_manager.ts";
import { path } from "compress/deps.ts";
import { Artifact, Materializer } from "../typegraph/types.ts";
import { Typegate } from "../typegate/mod.ts";
import {
  Interrupt,
  Operation,
  Result,
  WorkerData,
  WorkflowResult,
} from "./substantial/types.ts";
import { Backend } from "../../engine/runtime.js";

const logger = getLogger(import.meta);

type QueryWorkflowResult = {
  run_id: string;
  started_at: string;
  ended_at: string;
  result: {
    status: "COMPLETED" | "COMPLETED_WITH_ERROR" | "UNKNOWN";
    value: unknown; // hinted by the user
  };
};

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: Backend;
  private workerManager: WorkerManager;
  private workflowFiles: Map<string, string> = new Map();
  private workflowResults: Map<string, Array<QueryWorkflowResult>> = new Map(); // TODO: move to backend
  private receivedStagedEvents: Map<string, Array<Operation>> = new Map();
  private workflowRelaunchDelayMs: number;

  private constructor(
    typegraphName: string,
    backend: Backend,
    workerManager: WorkerManager,
    relaunchDelayMs: number
  ) {
    super(typegraphName);
    this.logger = getLogger(`substantial:'${typegraphName}'`);
    this.backend = backend;
    this.workerManager = workerManager;
    this.workflowRelaunchDelayMs = relaunchDelayMs;
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
    const backend = (args as any)!.backend as Backend;
    const workerManager = WorkerManager.getInstance();

    const instance = new SubstantialRuntime(
      tgName,
      backend,
      workerManager,
      typegate.config.base.substantial_relaunch_ms
    );

    await instance.#prepareWorkflowFiles(
      tg.meta.artifacts,
      materializers,
      typegate
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
    _verbose: boolean
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
                `Unsupported operation type '${stage.props.operationType}'`
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
    const matName = mat.name;
    const data = mat?.data ?? {};
    const workflowName = data.name as string;

    switch (matName) {
      case "start":
        return this.#startResolver(workflowName);
      case "stop":
        return ({ run_id }) => {
          this.#stageEvent(run_id, {
            at: new Date().toJSON(),
            event: {
              type: "Stop",
              result: {
                Err: "ABORTED",
              },
            },
          });

          return run_id;
        };
      case "send":
        return ({ run_id, event_name, payload }) => {
          this.#stageEvent(run_id, {
            at: new Date().toJSON(),
            event: {
              type: "Send",
              event_name,
              value: payload,
            },
          });

          return run_id;
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
        })
      );

      this.workerManager.triggerStart(
        workflowName,
        runId,
        modPath,
        run,
        kwargs
      );
      this.workerManager.listen(
        runId,
        this.#eventResultHandlerFor(workflowName, runId)
      );

      return runId;
    };
  }

  async #prepareWorkflowFiles(
    artifacts: Record<string, Artifact>,
    materializers: Materializer[],
    typegate: Typegate
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
        typegate
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
    typegate: Typegate
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
    return async (result: Result<unknown>) => {
      if (result.error) {
        // All Worker/Runner non-user issue should fall here
        // Note: Should never throw (typegate will panic), this will run in a worker
        logger.error(
          `result error for "${runId}": ${JSON.stringify(result.payload)}`
        );
        return;
      }

      const answer = result.payload as WorkerData;
      logger.info(`"${runId}" answered: type ${JSON.stringify(answer.type)}`);

      const startedAt = this.workerManager.getInitialTimeStartedAt(runId);

      switch (answer.type) {
        case "START": {
          const ret = answer.data as WorkflowResult;

          // Keep the backend updated with the latest emitted events
          const run = ret.run;
          run.operations = [...run.operations, ...this.#getStagedEvents(runId)];
          const _run = nativeResult(
            native.persistRun({
              backend: this.backend,
              run,
            })
          );

          switch (Interrupt.getTypeOf(ret.exception)) {
            case "SLEEP":
            case "WAIT_ENSURE_VALUE":
            case "WAIT_HANDLE_EVENT":
            case "WAIT_RECEIVE_EVENT": {
              await this.#workflowHandleInterrupts(workflowName, runId, ret);
              break;
            }
            default: {
              this.#workflowHandleGracefullCompletion(
                startedAt,
                workflowName,
                runId,
                ret
              );
            }
          }

          break;
        }
        default:
          logger.error(
            `Invalid type ${answer.type} send by "${runId}": ${JSON.stringify(
              answer.data
            )}`
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

  #stageEvent(runId: string, event: Operation) {
    if (!this.receivedStagedEvents.has(runId)) {
      this.receivedStagedEvents.set(runId, []);
    }
    this.receivedStagedEvents.get(runId)!.push(event);
  }

  #getStagedEvents(runId: string): Array<Operation> {
    const staged = this.receivedStagedEvents.get(runId) ?? [];
    this.receivedStagedEvents.delete(runId);
    return staged;
  }

  async #workflowHandleInterrupts(
    workflowName: string,
    runId: string,
    { result, run }: WorkflowResult
  ) {
    await sleep(this.workflowRelaunchDelayMs);

    this.workerManager.destroyWorker(workflowName, runId); // !

    logger.warn(
      `Interrupt "${workflowName}": ${result}, relaunching under "${runId}"`
    );
    this.workerManager.triggerStart(
      workflowName,
      runId,
      this.#getModPath(workflowName),
      run,
      run.operations[0]
    );
    this.workerManager.listen(
      runId,
      this.#eventResultHandlerFor(workflowName, runId)
    );
  }

  #workflowHandleGracefullCompletion(
    startedAt: Date,
    workflowName: string,
    runId: string,
    { result, kind }: WorkflowResult
  ) {
    this.workerManager.destroyWorker(workflowName, runId); // !

    logger.info(
      `gracefull completion of "${runId}": ${JSON.stringify(result)}`
    );
    this.#addResult(workflowName, {
      run_id: runId,
      started_at: startedAt.toJSON(),
      ended_at: new Date().toJSON(),
      result: {
        status: kind == "FAIL" ? "COMPLETED_WITH_ERROR" : "COMPLETED",
        value: result, // shape hinted by the user through the typegraph
      },
    });
  }
}
