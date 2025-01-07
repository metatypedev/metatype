// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../log.ts";
import { TaskContext } from "../deno/shared_types.ts";
import {
  BaseWorkerManager,
  DenoWorker,
  TaskId,
} from "../utils/worker_manager.ts";
import { Run, WorkerEvent, WorkerEventHandler } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

// export type WorkerRecord = {
//   worker: BaseWorker;
//   modulePath: string;
// };
export type WorkflowSpec = {
  modulePath: string;
};
// export type RunId = string;
// export type WorkflowName = string;

// export class WorkflowRecorder {
//   workflowRuns: Map<WorkflowName, Set<RunId>> = new Map();
//   workers: Map<RunId, WorkerRecord> = new Map();
//   startedAtRecords: Map<RunId, Date> = new Map();
//
//   getRegisteredWorkflowNames() {
//     return Array.from(this.workflowRuns.keys());
//   }
//
//   hasRun(runId: RunId) {
//     return this.workers.has(runId);
//   }
//
//   getWorkerRecord(runId: RunId) {
//     const record = this.workers.get(runId);
//     if (!record) {
//       throw new Error(`Run "${runId}" does not exist or has been completed`);
//     }
//
//     return record!;
//   }
//
//   addWorker(
//     name: WorkflowName,
//     runId: RunId,
//     worker: WorkerRecord,
//     startedAt: Date,
//   ) {
//     if (!this.workflowRuns.has(name)) {
//       this.workflowRuns.set(name, new Set());
//     }
//
//     this.workflowRuns.get(name)!.add(runId);
//     this.workers.set(runId, worker);
//     if (!this.startedAtRecords.has(runId)) {
//       this.startedAtRecords.set(runId, startedAt);
//     }
//   }
//
//   destroyAllWorkers() {
//     for (const name of this.getRegisteredWorkflowNames()) {
//       this.destroyRelatedWorkers(name);
//     }
//   }
//
//   destroyRelatedWorkers(name: WorkflowName) {
//     if (this.workflowRuns.has(name)) {
//       const runIds = this.workflowRuns.get(name)!.values();
//       for (const runId of runIds) {
//         this.destroyWorker(name, runId);
//       }
//       return true;
//     }
//     return false;
//   }
//
//   destroyWorker(name: WorkflowName, runId: RunId) {
//     const record = this.workers.get(runId);
//     if (this.workflowRuns.has(name)) {
//       if (!record) {
//         logger.warn(
//           `"${runId}" associated with "${name}" does not exist or has been already destroyed`,
//         );
//         return false;
//       }
//
//       record!.worker.destroy(); // !
//
//       this.workflowRuns.get(name)!.delete(runId);
//       this.workers.delete(runId);
//
//       // Let it alive throughout typegate lifetime
//       // x this.startedAtRecords.delete(runId);
//       return true;
//     }
//
//     return false;
//   }
// }

/**
 * - A workflow file can contain multiple workflows (functions)
 * - A workflow can be run as many times as a START event is triggered (with a run_id)
 * - The completion of a workflow is run async, it is entirely up to the event listeners to act upon the results
 */
export class WorkerManager extends BaseWorkerManager<WorkflowSpec> {
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

  trigger(type: WorkerEvent, runId: TaskId, data: unknown) {
    const { worker } = this.getTask(runId);
    worker.trigger(type, data);
    logger.info(`trigger ${type} for ${runId}`);
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
    this.trigger("START", runId, {
      modulePath: workflowModPath,
      functionName: name,
      run: storedRun,
      schedule,
      internal: internalTCtx,
    });
  }
}
