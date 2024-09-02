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
import { WorkerData } from "@typegate/runtimes/substantial/types.ts";

const logger = getLogger(import.meta);

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;
  private backend: native.Backend;
  private workerManager: WorkerManager;

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

    // Allocate workers for the loaaded files
    await instance.prepareWorkers(tg.meta.artifacts, materializers, typegate);

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
      const runId = data.name as string;

      if (name === "start") {
        return () => {
          const { run } = nativeResult(
            native.createOrGetRun({
              backend: this.backend,
              run_id: runId,
            }),
          );

          const startOutput = this.workerManager.triggerStart(runId, run);
          logger.info(`Running workflow: ${startOutput}`);

          return startOutput;
        };
      }

      if (name === "stop") {
        this.workerManager.triggerStop(runId);
        return runId;
      }

      if (name === "event") {
        this.workerManager.trigger("SEND", runId, data);
        return runId;
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

  async prepareWorkers(
    artifacts: Record<string, Artifact>,
    materializers: Materializer[],
    typegate: Typegate,
  ) {
    const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");

    for (const mat of materializers) {
      if (!["start", "stop", "send"].includes(mat.name)) {
        continue;
      }

      const matData = mat.data;
      const entryModulePath = await this.#getWorkflowEntryPointPath(
        artifacts,
        matData,
        typegate,
      );

      // Note: for now, this is just the function name
      const runId = matData.name as string;
      this.workerManager.createWorker(matData.name as string, entryModulePath);

      this.workerManager.listen(matData.name as string, (result) => {
        if (result.error) {
          // TODO: better way to notify back through gql
          logger.error(result.payload);
          return;
        }

        const backend = this.backend;
        const payload = result.payload as WorkerData;
        switch (payload.type) {
          case "START": {
            // gracefull completion
            const result = nativeResult(
              native.persistRun({
                backend,
                run: payload.data.run,
              }),
            );
            // TODO: better way to notify back through gql
            // Through start maybe? or mutation { resultOf(name: "example") }
            logger.info(
              `completed execution ${runId}: ${result} :: ${
                JSON.stringify(
                  payload,
                )
              }`,
            );
            break;
          }
          case "SEND": {
            logger.info(`event sent ${runId}: ${JSON.stringify(payload)}`);
            break;
          }
          case "STOP": {
            logger.info(
              `forcefully stopped ${runId}: ${JSON.stringify(payload)}`,
            );
            break;
          }
          default:
            logger.error(payload);
        }
      });

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
}
