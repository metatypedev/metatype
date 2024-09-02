// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";
import {
  Err,
  Ok,
  Run,
  WorkerData,
  WorkerEvent,
  WorkerEventHandler,
} from "./types.ts";

const logger = getLogger();

export type WorkerRecord = { worker: Worker; modulePath: string };

export class WorkerManager {
  private static instance: WorkerManager;
  private records: Map<string, WorkerRecord> = new Map();

  private constructor() {}

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  createWorker(name: string, modulePath: string): void {
    if (this.records.has(name)) {
      logger.warn(`Worker with name ${name} already exists, overwriting..`);
      this.destroyWorker(name);
    }

    const worker = new Worker(import.meta.resolve("./worker.ts"), {
      type: "module",
    });

    this.records.set(name, { worker, modulePath });
  }

  destroyWorker(name: string): void {
    const record = this.records.get(name);
    if (record) {
      record.worker.terminate();
      this.records.delete(name);
    } else {
      throw new Error(`Worker with name ${name} does not exist`);
    }
  }

  destroyAllWorkers() {
    const workerNames = Array.from(this.records.keys());
    for (const name of workerNames) {
      this.destroyWorker(name);
    }

    logger.warn(`Destroyed workers: ${workerNames.join(", ")}`);
  }

  #getRecord(name: string): WorkerRecord {
    const record = this.records.get(name);
    if (!record) {
      throw new Error(`Worker with name ${name} does not exist`);
    }
    return record;
  }

  listen(name: string, handlerFn: WorkerEventHandler) {
    const { worker } = this.#getRecord(name);

    worker.onmessage = (e) => {
      if (e.data.error) {
        handlerFn(Err(e.data.error));
      } else {
        handlerFn(Ok(e.data));
      }
    };

    worker.onerror = (e) => handlerFn(Err(e));
  }

  trigger(type: WorkerEvent, name: string, data: unknown) {
    const { worker } = this.#getRecord(name);
    worker.postMessage({
      type,
      data,
    } as WorkerData);
  }

  triggerStart(name: string, storedRun: Run) {
    const { modulePath } = this.#getRecord(name);
    this.trigger("START", name, {
      modulePath,
      functionName: name,
      run: storedRun,
    });
  }

  triggerStop(name: string) {
    this.trigger("STOP", name, {});
  }
}
