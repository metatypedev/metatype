// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../log.ts";
import { TaskContext } from "../deno/shared_types.ts";
import { DenoWorker } from "../patterns/worker_manager/deno.ts";
import { BaseWorkerManager } from "../patterns/worker_manager/mod.ts";
import { EventHandler, TaskId } from "../patterns/worker_manager/types.ts";
import { Run, WorkflowEvent, WorkflowMessage } from "./types.ts";

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
  extends BaseWorkerManager<WorkflowSpec, WorkflowMessage, WorkflowEvent> {
  constructor() {
    super("substantial workflows", (taskId: TaskId) => {
      return new DenoWorker(taskId, import.meta.resolve("./worker.ts"));
    });
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

  listen(runId: TaskId, handlerFn: EventHandler<WorkflowEvent>) {
    if (!this.hasTask(runId)) {
      // Note: never throw on worker events, this will make typegate panic!
      logger.warn(`Attempt listening on missing ${runId}`);
      return;
    }

    const { worker } = this.getTask(runId);

    worker.listen(handlerFn);
  }

  override logMessage(runId: TaskId, msg: WorkflowMessage) {
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
    this.delegateTask(name, runId, {
      modulePath: workflowModPath,
    }).then(() => {
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
    });
  }
}
