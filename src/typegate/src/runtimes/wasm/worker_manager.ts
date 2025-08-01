// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { globalConfig } from "../../config.ts";
import { getLogger } from "../../log.ts";
import type { WitOpArgs } from "../../types.ts";
import { WasmWorker } from "../patterns/worker_manager/wasm.ts";
import {
  BaseWorkerManager,
  createTaskId,
} from "../patterns/worker_manager/mod.ts";
import { WorkerPool } from "../patterns/worker_manager/pooling.ts";
import type { TaskId } from "../patterns/worker_manager/types.ts";
import { hostcall, type HostCallCtx } from "../wit_wire/hostcall.ts";
import type { TaskSpec, WasmEvent, WasmMessage } from "./types.ts";

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
        (id: string) => new WasmWorker(id, import.meta.resolve("./worker.ts")),
      );
    }
    return WorkerManager.#pool!;
  }

  constructor(private hostcallCtx: HostCallCtx) {
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
      const handler: (event: WasmEvent) => void = async (event) => {
        if (event.type !== "HOSTCALL") {
          this.deallocateWorker(name, taskId);
        }

        switch (event.type) {
          case "HOSTCALL":
            this.sendMessage(taskId, {
              type: "HOSTCALL",
              result: await hostcall(
                this.hostcallCtx,
                event.opName,
                event.json,
              ),
            });
            break;
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
