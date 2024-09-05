// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import {
  Err,
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
  startedAt: Date;
};
export type RunId = string;
export type WorkflowName = string;

export class WorkflowRecorder {
  workflowRuns: Map<WorkflowName, Set<RunId>> = new Map();
  workers: Map<RunId, WorkerRecord> = new Map();

  getRegisteredWorkflowNames() {
    return Array.from(this.workflowRuns.keys());
  }

  getWorkerRecord(runId: RunId) {
    const record = this.workers.get(runId);
    if (!record) {
      throw new Error(`Run "${runId}" does not exist or has been completed`);
    }

    return record!;
  }

  addWorker(name: WorkflowName, runId: RunId, worker: WorkerRecord) {
    if (!this.workflowRuns.has(name)) {
      this.workflowRuns.set(name, new Set());
    }

    this.workflowRuns.get(name)!.add(runId);
    this.workers.set(runId, worker);
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
        // TODO: throw?
        logger.error(
          `invalid state: "${runId}" associated with "${name}" does not exist`,
        );
        return false;
      }

      record!.worker.terminate(); // !

      this.workflowRuns.get(name)!.delete(runId);
      this.workers.delete(runId);
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
  private static instance: WorkerManager;
  private recorder: WorkflowRecorder = new WorkflowRecorder();

  private constructor() {}

  #nextId(name: string): RunId {
    const uuid = crypto.randomUUID();
    return `${name}_${uuid}`;
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  #createWorker(name: string, modulePath: string, knownRunId?: RunId): RunId {
    const runId = knownRunId ?? this.#nextId(name);

    const worker = new Worker(import.meta.resolve("./worker.ts"), {
      type: "module",
    });

    this.recorder.addWorker(name, runId, {
      modulePath,
      worker,
      startedAt: new Date(),
    });

    return runId;
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

  getAllocatedRessources(name: WorkflowName) {
    const runIds = this.recorder.workflowRuns.get(name) ?? new Set<string>();
    return {
      count: runIds.size,
      workflow: name,
      running: Array.from(runIds).map((runId) => {
        const { startedAt: started_at } = this.recorder.getWorkerRecord(runId);
        return { run_id: runId, started_at };
      }),
    };
  }

  getTimeStartedAt(runId: RunId): Date {
    const rec = this.recorder.workers.get(runId);
    if (!rec) {
      throw new Error(`Cannot find run "${runId}"`);
    }
    return rec.startedAt;
  }

  listen(runId: RunId, handlerFn: WorkerEventHandler) {
    const { worker } = this.recorder.getWorkerRecord(runId);

    worker.onmessage = (message) => {
      if (message.data.error) {
        // worker level failure
        handlerFn(Err(message.data.error));
      } else {
        // logic level Result (Ok | Err)
        logger.warn(message.data);
        handlerFn(message.data as Result<unknown>);
      }
    };

    worker.onerror = (event) => handlerFn(Err(event));
  }

  trigger(type: WorkerEvent, runId: RunId, data: unknown) {
    const { worker } = this.recorder.getWorkerRecord(runId);
    worker.postMessage(Msg(type, data));
    logger.info(`trigger ${type} for ${runId}: ${JSON.stringify(data)}`);
  }

  triggerStart(
    name: string,
    workflowModPath: string,
    storedRun: Run,
    kwargs: Record<string, unknown>,
    knownRunId?: RunId,
  ): RunId {
    const runId = this.#createWorker(name, workflowModPath, knownRunId);
    this.trigger("START", runId, {
      modulePath: workflowModPath,
      functionName: name,
      run: storedRun,
      kwargs,
    });

    return runId;
  }

  triggerStop(runId: RunId) {
    this.trigger("STOP", runId, {});
  }
}
