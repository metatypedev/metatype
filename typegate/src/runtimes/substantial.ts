// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { Resolver, RuntimeInitParams } from "../types.ts";
import { ComputeStage } from "../engine/query_engine.ts";
import { TypeGraph } from "../typegraph/mod.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, Logger } from "../log.ts";
import * as native from "native";
import { nativeResult } from "../utils.ts";
import { WorkerManager } from "./substantial/deno_worker_manager.ts";
import { path } from "compress/deps.ts";
import { Artifact, Materializer } from "@typegate/typegraph/types.ts";
import { Typegate } from "@typegate/typegate/mod.ts";
import { Result, WorkerData } from "@typegate/runtimes/substantial/types.ts";

const logger = getLogger(import.meta);

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: native.Backend;
  private workerManager: WorkerManager;
  private workflowFiles: Map<string, string> = new Map();

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

    await instance.prepareWorkflowFiles(
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
    const name = stage.props.materializer?.name;
    const mat = stage.props.materializer;
    const resolver: Resolver = (() => {
      const data = mat?.data ?? {};

      if (name === "start") {
        return () => {
          const workflowName = data.name as string;
          const modPath = this.workflowFiles.get(workflowName);
          if (!modPath) {
            throw new Error(
              `Fatal: cannot find workflow file for "${workflowName}"`,
            );
          }

          const { run } = nativeResult(
            native.createOrGetRun({
              backend: this.backend,
              run_id: workflowName, // FIXME: rename to name
            }),
          );

          const runId = this.workerManager.triggerStart(
            workflowName,
            modPath,
            run,
          );

          this.workerManager.listen(runId, this.#eventResultHandlerFor(runId));

          return runId;
        };
      } else if (name === "stop") {
        return ({ run_id }: any) => {
          this.workerManager.triggerStop(run_id);
          return run_id;
        };
      } else if (name === "event") {
        return ({ run_id }: any) => {
          this.workerManager.trigger("SEND", run_id, data);
        };
      }

      return () => null;
    })();

    return [
      new ComputeStage({
        ...stage.props,
        resolver,
      }),
    ];
  }

  async prepareWorkflowFiles(
    artifacts: Record<string, Artifact>,
    materializers: Materializer[],
    typegate: Typegate,
  ) {
    const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");

    for (const mat of materializers) {
      if (!["start", "stop", "send"].includes(mat.name)) {
        continue;
      }

      const entryModulePath = await this.#getWorkflowEntryPointPath(
        artifacts,
        mat.data,
        typegate,
      );

      const { name: workflowName } = mat.data;
      this.workflowFiles.set(workflowName as string, entryModulePath);
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

  #eventResultHandlerFor(runId: string) {
    return (result: Result<unknown>) => {
      if (result.error) {
        // TODO: better way to notify back through gql
        logger.error(
          `result error for "${runId}": ${JSON.stringify(result.payload)}`,
        );
        return;
      }

      const answer = result.payload as WorkerData;
      logger.info(`"${runId}" answered with: ${JSON.stringify(answer)}`);

      const backend = this.backend;
      switch (answer.type) {
        case "START": {
          // gracefull completion
          const result = nativeResult(
            native.persistRun({
              backend,
              run: answer.data.run,
            }),
          );
          // TODO: better way to notify back through gql
          // Through start maybe? or mutation { resultOf(name: "example") }
          logger.info(
            `completed execution "${runId}": ${result} :: ${
              JSON.stringify(
                answer.data,
              )
            }`,
          );
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
}
