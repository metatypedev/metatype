// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../log.ts";
import { DenoWorker } from "../patterns/worker_manager/deno.ts";
import {
  BaseWorkerManager,
  createTaskId,
} from "../patterns/worker_manager/mod.ts";
import { TaskId } from "../patterns/worker_manager/types.ts";
import { TaskContext } from "./shared_types.ts";
import { DenoEvent, DenoMessage, TaskSpec } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

export type WorkerManagerConfig = {
  timeout_ms: number;
};

export class WorkerManager
  extends BaseWorkerManager<TaskSpec, DenoMessage, DenoEvent> {
  constructor(private config: WorkerManagerConfig) {
    super(
      // TODO runtime name?
      "deno runtime",
      (taskId: TaskId) => {
        return new DenoWorker(taskId, import.meta.resolve("./worker.ts"));
      },
    );
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

      const handler: (event: DenoEvent) => void = (event) => {
        clearTimeout(timeoutId);
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

  override logMessage(taskId: TaskId, msg: DenoMessage) {
    logger.info(`Task "${taskId}" received message: ${msg.type}`);
  }
}
