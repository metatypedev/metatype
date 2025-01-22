// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { globalConfig } from "../../config.ts";
import { getLogger } from "../../log.ts";
import { WitOpArgs } from "../../types.ts";
import { DenoWorker } from "../patterns/worker_manager/deno.ts";
import {
  BaseWorkerManager,
  createTaskId,
} from "../patterns/worker_manager/mod.ts";
import { WorkerPool } from "../patterns/worker_manager/pooling.ts";
import { TaskId } from "../patterns/worker_manager/types.ts";
import { WasmEvent, WasmMessage, TaskSpec } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

export class WorkerManager extends BaseWorkerManager<
  TaskSpec,
  WasmMessage,
  WasmEvent
> {
  static #pool: WorkerPool<TaskSpec, WasmMessage, WasmEvent> | null = null;
  static #getPool() {
    if (!WorkerManager.#pool) {
      WorkerManager.#pool = new WorkerPool(
        "wasm runtime",
        {
          minWorkers: globalConfig.min_wasm_workers,
          maxWorkers: globalConfig.max_wasm_workers,
          waitTimeoutMs: globalConfig.wasm_worker_wait_timeout_ms,
        },
        (id: string) => new DenoWorker(id, import.meta.resolve("./worker.ts")),
      );
    }
    return WorkerManager.#pool!;
  }

  constructor() {
    super(WorkerManager.#getPool());
  }

  async callWitOp(params: WitOpArgs) {
    const taskId = createTaskId(`${params.opName}@${params.componentPath}`);
    await this.delegateTask(name, taskId, {
      componentPath: params.componentPath,
      opName: params.opName,
    });
    this.sendMessage(taskId, {
      type: "CALL",
      ...params,
    });

    return new Promise((resolve, reject) => {
      const handler: (event: WasmEvent) => void = (event) => {
        this.deallocateWorker(name, taskId);
        switch (event.type) {
          case "SUCCESS":
            resolve(event.result);
            break;
          case "FAILURE":
            reject(event.exception ?? event.error);
            break;
        }
      };

      const { worker } = this.getTask(taskId);
      worker.listen(handler);
    });
  }

  override logMessage(taskId: TaskId, msg: WasmMessage) {
    logger.info(`Task "${taskId}" received message: ${msg.type}`);
  }
}
