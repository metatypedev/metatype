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

const logger = getLogger(import.meta);

@registerRuntime("substantial")
export class SubstantialRuntime extends Runtime {
  private logger: Logger;

  private constructor(typegraphName: string) {
    super(typegraphName);
    this.logger = getLogger(`substantial:'${typegraphName}'`);
  }

  static async init(params: RuntimeInitParams): Promise<Runtime> {
    logger.info("initializing SubstantialRuntime");
    logger.debug(`init params: ${JSON.stringify(params)}`);
    const {
      typegraph: tg,
      typegraphName,
      args: _,
      materializers,
      secretManager,
      typegate,
    } = params;

    const artifacts = tg.meta.artifacts;

    const secrets: Record<string, string> = {};

    for (const m of materializers) {
      for (const secretName of (m.data.secrets as []) ?? []) {
        secrets[secretName] = secretManager.secretOrFail(secretName);
      }
    }

    // Allocate workers for the loaaded files
    const basePath = path.join(typegate.config.base.tmp_dir, "artifacts");
    for (const mat of materializers) {
      if (!["start", "stop", "send"].includes(mat.name)) {
        continue;
      }

      const matData = mat.data;
      const entryPoint = artifacts[matData.file as string];
      const deps = (matData.deps as string[]).map((dep) => artifacts[dep]);

      const moduleMeta = {
        typegraphName: typegraphName,
        relativePath: entryPoint.path,
        hash: entryPoint.hash,
        sizeInBytes: entryPoint.size,
      };

      const depMetas = deps.map((dep) => {
        return {
          typegraphName: typegraphName,
          relativePath: dep.path,
          hash: dep.hash,
          sizeInBytes: dep.size,
        };
      });

      const entryModulePath = await typegate.artifactStore.getLocalPath(
        moduleMeta,
        depMetas,
      );

      const workerManager = WorkerManager.getInstance();
      workerManager.createWorker(matData.name as string, entryModulePath);

      logger.info(`Resolved runtime artifacts at ${basePath}`);
    }

    const tgName = TypeGraph.formatName(tg);
    const instance = new SubstantialRuntime(tgName);
    return instance;
  }

  deinit(): Promise<void> {
    logger.info("deinitializing SubstantialRuntime");
    WorkerManager.destroyAllWorkers();
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
              backend: "Memory",
              run_id: runId,
            }),
          );

          const result = await WorkerManager.execute(data.name as string, run);
          console.log("Workflow result", result);

          const persistedRes = nativeResult(
            native.persistRun({
              backend: "Memory",
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
}
