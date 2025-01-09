// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../log.ts";
import { DenoWorker } from "../utils/workers/deno.ts";
import { BaseWorkerManager, createTaskId } from "../utils/workers/manager.ts";
import { TaskId } from "../utils/workers/types.ts";
import { TaskContext } from "./shared_types.ts";
import { DenoEvent, DenoMessage, TaskSpec } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

export class WorkerManager
  extends BaseWorkerManager<TaskSpec, DenoMessage, DenoEvent> {
  constructor() {
    super(
      (taskId: TaskId) => {
        return new DenoWorker(taskId, import.meta.resolve("./worker.ts"));
      },
    );
  }

  callFunction(
    name: string,
    modulePath: string,
    relativeModulePath: string,
    args: unknown,
    internalTCtx: TaskContext,
  ) {
    const taskId = createTaskId(`${name}@${relativeModulePath}`);
    this.createWorker(name, taskId, {
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
      const handler: (event: DenoEvent) => void = (event) => {
        switch (event.type) {
          case "SUCCESS":
            resolve(event.result);
            break;
          case "FAILURE":
            reject(event.error);
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
