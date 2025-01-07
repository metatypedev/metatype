// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../log.ts";
import { TaskContext } from "../deno/shared_types.ts";
import {
  BaseWorkerManager,
  DenoWorker,
  TaskId,
} from "../utils/worker_manager.ts";
import { Run, WorkerEventHandler, WorkflowMessage } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

export type WorkflowSpec = {
  modulePath: string;
};

/**
 * - A workflow file can contain multiple workflows (functions)
 * - A workflow can be run as many times as a START event is triggered (with a run_id)
 * - The completion of a workflow is run async, it is entirely up to the event listeners to act upon the results
 */
export class WorkerManager
  extends BaseWorkerManager<WorkflowSpec, WorkflowMessage> {
  constructor() {
    super((taskId: TaskId) => {
      return new DenoWorker(taskId, import.meta.resolve("./worker.ts"));
    });
  }

  #createWorker(name: string, modulePath: string, runId: TaskId) {
    const worker = this.workerFactory(runId);

    this.addWorker(
      name,
      runId,
      worker,
      {
        modulePath,
      },
      new Date(),
    );
  }

  destroyWorker(name: string, runId: string) {
    return super.destroyWorker(name, runId);
  }

  destroyAllWorkers() {
    super.destroyAllWorkers();
    logger.warn(
      `Destroyed workers for ${
        this
          .getActiveTaskNames()
          .map((w) => `"${w}"`)
          .join(", ")
      }`,
    );
  }

  isOngoing(runId: TaskId) {
    return this.hasTask(runId);
  }

  getAllocatedResources(name: string) {
    const runIds = super.getTasksByName(name) ?? new Set<string>();
    return {
      count: runIds.size,
      workflow: name,
      running: Array.from(runIds).map((runId) => {
        return {
          run_id: runId,
          started_at: this.getInitialTimeStartedAt(runId),
        };
      }),
    };
  }

  listen(runId: TaskId, handlerFn: WorkerEventHandler) {
    if (!this.hasTask(runId)) {
      // Note: never throw on worker events, this will make typegate panic!
      logger.warn(`Attempt listening on missing ${runId}`);
      return;
    }

    const { worker } = this.getTask(runId);

    worker.listen(handlerFn);
  }

  sendMessage(runId: TaskId, msg: WorkflowMessage) {
    const { worker } = this.getTask(runId);
    worker.send(msg);
    logger.info(`trigger ${msg.type} for ${runId}`);
  }

  triggerStart(
    name: string,
    runId: string,
    workflowModPath: string,
    storedRun: Run,
    schedule: string,
    internalTCtx: TaskContext,
  ) {
    this.#createWorker(name, workflowModPath, runId);
    this.sendMessage(runId, {
      type: "START",
      data: {
        modulePath: workflowModPath,
        functionName: name,
        run: storedRun,
        schedule,
        internal: internalTCtx,
      },
    });
  }
}
