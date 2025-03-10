// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { globalConfig } from "../../config.ts";
import { getLogger } from "../../log.ts";
import { DenoWorker } from "../patterns/worker_manager/deno.ts";
import {
  BaseWorkerManager,
  createTaskId,
} from "../patterns/worker_manager/mod.ts";
import { WorkerPool } from "../patterns/worker_manager/pooling.ts";
import { TaskId } from "../patterns/worker_manager/types.ts";
import { hostcall, HostCallCtx } from "../wit_wire/hostcall.ts";
import { TaskContext } from "./shared_types.ts";
import { DenoEvent, DenoMessage, TaskSpec } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

export type WorkerManagerConfig = {
  timeout_ms: number;
};

export class WorkerManager
  extends BaseWorkerManager<TaskSpec, DenoMessage, DenoEvent> {
  static #pool: WorkerPool<TaskSpec, DenoMessage, DenoEvent> | null = null;
  static #getPool() {
    if (!WorkerManager.#pool) {
      WorkerManager.#pool = new WorkerPool(
        "deno runtime",
        {
          minWorkers: globalConfig.min_deno_workers,
          maxWorkers: globalConfig.max_deno_workers,
          waitTimeoutMs: globalConfig.deno_worker_wait_timeout_ms,
        },
        (id: string) => new DenoWorker(id, import.meta.resolve("./worker.ts")),
      );
    }
    return WorkerManager.#pool!;
  }

  constructor(
    private config: WorkerManagerConfig,
    private hostcallCtx: HostCallCtx,
  ) {
    super(WorkerManager.#getPool());
  }

  async callFunction(
    name: string,
    modulePath: string,
    relativeModulePath: string,
    args: unknown,
    internalTCtx: TaskContext,
  ) {
    const taskId = createTaskId(`${name}@${relativeModulePath}`);
    await this.delegateTask(name, taskId, {
      modulePath,
      functionName: name,
    });
    this.sendMessage(taskId, {
      type: "CALL",
      modulePath,
      functionName: name,
      args,
      internals: internalTCtx,
    });

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.deallocateWorker(name, taskId);
        reject(new Error(`${this.config.timeout_ms}ms timeout exceeded`));
      }, this.config.timeout_ms);

      const handler: (event: DenoEvent) => void = async (event) => {
        switch (event.type) {
          case "HOSTCALL": {
            let result;
            let error;
            try {
              result = await hostcall(
                this.hostcallCtx,
                event.opName,
                event.json,
              );
            } catch (err) {
              error = err;
            }
            this.sendMessage(taskId, {
              type: "HOSTCALL_RESP",
              id: event.id,
              result,
              error,
            });
            break;
          }
          case "SUCCESS":
            clearTimeout(timeoutId);
            this.deallocateWorker(name, taskId);
            resolve(event.result);
            break;
          case "FAILURE":
            clearTimeout(timeoutId);
            this.deallocateWorker(name, taskId);
            reject(event.exception ?? event.error);
            break;
        }
      };

      const { worker } = this.getTask(taskId);
      worker.listen(handler);
    });
  }

  override logMessage(taskId: TaskId, msg: DenoMessage) {
    logger.info(`Task "${taskId}" received message: ${msg.type}`);
  }
}
