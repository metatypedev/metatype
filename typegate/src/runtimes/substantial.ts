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

      if (name === "start") {
        return async () => {
          const runId = data.name as string;
          const { run } = nativeResult(
            native.createOrGetRun({
              backend: this.backend,
              run_id: runId,
            }),
          );

          const result = await this.workerManager.execute(
            data.name as string,
            run,
          );
          console.log("Workflow result", result);

          const persistedRes = nativeResult(
            native.persistRun({
              backend: this.backend,
              run,
            }),
          );
          return persistedRes;
        };
      }

      if (name === "stop") {
        throw new Error(JSON.stringify(data));
      }

      if (name === "event") {
        throw new Error(JSON.stringify(data));
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
      this.workerManager.createWorker(matData.name as string, entryModulePath);
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
