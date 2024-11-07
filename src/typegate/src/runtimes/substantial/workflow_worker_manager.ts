// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { envSharedWithWorkers } from "../../config/shared.ts";
import { getLogger } from "../../log.ts";
import { TaskContext } from "../deno/shared_types.ts";
import {
  Data,
  Err,
  Kind,
  Msg,
  Result,
  Run,
  WorkerEvent,
  WorkerEventHandler,
} from "./types.ts";

const logger = getLogger();

export type WorkerRecord = {
  worker: Worker;
  modulePath: string;
};
export type RunId = string;
export type WorkflowName = string;

export class WorkflowRecorder {
  workflowRuns: Map<WorkflowName, Set<RunId>> = new Map();
  workers: Map<RunId, WorkerRecord> = new Map();
  startedAtRecords: Map<RunId, Date> = new Map();

  getRegisteredWorkflowNames() {
    return Array.from(this.workflowRuns.keys());
  }

  hasRun(runId: RunId) {
    return this.workers.has(runId);
  }

  getWorkerRecord(runId: RunId) {
    const record = this.workers.get(runId);
    if (!record) {
      throw new Error(`Run "${runId}" does not exist or has been completed`);
    }

    return record!;
  }

  addWorker(
    name: WorkflowName,
    runId: RunId,
    worker: WorkerRecord,
    startedAt: Date,
  ) {
    if (!this.workflowRuns.has(name)) {
      this.workflowRuns.set(name, new Set());
    }

    this.workflowRuns.get(name)!.add(runId);
    this.workers.set(runId, worker);
    if (!this.startedAtRecords.has(runId)) {
      this.startedAtRecords.set(runId, startedAt);
    }
  }

  destroyAllWorkers() {
    for (const name of this.getRegisteredWorkflowNames()) {
      this.destroyRelatedWorkers(name);
    }
  }

  destroyRelatedWorkers(name: WorkflowName) {
    if (this.workflowRuns.has(name)) {
      const runIds = this.workflowRuns.get(name)!.values();
      for (const runId of runIds) {
        this.destroyWorker(name, runId);
      }
      return true;
    }
    return false;
  }

  destroyWorker(name: WorkflowName, runId: RunId) {
    const record = this.workers.get(runId);
    if (this.workflowRuns.has(name)) {
      if (!record) {
        logger.warn(
          `"${runId}" associated with "${name}" does not exist or has been already destroyed`,
        );
        return false;
      }

      record!.worker.terminate(); // !

      this.workflowRuns.get(name)!.delete(runId);
      this.workers.delete(runId);

      // Let it alive throughout typegate lifetime
      // x this.startedAtRecords.delete(runId);
      return true;
    }

    return false;
  }
}

/**
 * - A workflow file can contain multiple workflows (functions)
 * - A workflow can be run as many times as a START event is triggered (with a run_id)
 * - The completion of a workflow is run async, it is entirely up to the event listeners to act upon the results
 */
export class WorkerManager {
  private recorder: WorkflowRecorder = new WorkflowRecorder();

  constructor() {}

  #createWorker(name: string, modulePath: string, runId: RunId) {
    const worker = new Worker(import.meta.resolve("./worker.ts"), {
      name: runId,
      type: "module",
      deno: {
        permissions: {
          // overrideable default permissions
          hrtime: false,
          net: true,
          // on request permissions
          read: "inherit", // default read permission
          sys: "inherit",
          // non-overridable permissions (security between typegraphs)
          run: false,
          write: false,
          ffi: false,
          env: envSharedWithWorkers,
        },
      },
    });

    this.recorder.addWorker(
      name,
      runId,
      {
        modulePath,
        worker,
      },
      new Date(),
    );
  }

  destroyWorker(name: string, runId: string) {
    return this.recorder.destroyWorker(name, runId);
  }

  destroyAllWorkers() {
    this.recorder.destroyAllWorkers();
    logger.warn(
      `Destroyed workers for ${
        this.recorder
          .getRegisteredWorkflowNames()
          .map((w) => `"${w}"`)
          .join(", ")
      }`,
    );
  }

  isOngoing(runId: RunId) {
    return this.recorder.hasRun(runId);
  }

  getAllocatedResources(name: WorkflowName) {
    const runIds = this.recorder.workflowRuns.get(name) ?? new Set<string>();
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

  /** Returns a Date object representing the *initial* time the runId has been registered/run */
  getInitialTimeStartedAt(runId: RunId): Date {
    const rec = this.recorder.startedAtRecords.get(runId);
    if (!rec) {
      throw new Error(
        `Invalid state: cannot find initial time for run "${runId}"`,
      );
    }
    return rec;
  }

  listen(runId: RunId, handlerFn: WorkerEventHandler) {
    if (!this.recorder.hasRun(runId)) {
      // Note: never throw on worker events, this will make typegate panic!
      logger.warn(`Attempt listening on missing ${runId}`);
      return;
    }

    const { worker } = this.recorder.getWorkerRecord(runId);

    worker.onmessage = async (message) => {
      if (message.data.error) {
        // worker level failure
        await handlerFn(Err(message.data.error));
      } else {
        // logic level Result (Ok | Err)
        await handlerFn(message.data as Result<unknown>);
      }
    };

    worker.onerror = /*async*/ (event) => handlerFn(Err(event));
  }

  trigger(type: WorkerEvent, runId: RunId, data: Data) {
    const { worker } = this.recorder.getWorkerRecord(runId);
    worker.postMessage(Msg(type, data));
    logger.info(`trigger ${type} for ${runId}`);
  }

  triggerStart(
    name: string,
    runId: string,
    workflowModPath: string,
    storedRun: Run,
    schedule: string,
    kwargs: Record<string, unknown>,
    internalTCtx: TaskContext,
    kind: Kind,
  ) {
    this.#createWorker(name, workflowModPath, runId);
    this.trigger("START", runId, {
      modulePath: workflowModPath,
      functionName: name,
      run: storedRun,
      kwargs,
      schedule,
      internal: internalTCtx,
      kind,
    });
  }
}
