// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../log.ts";

const logger = getLogger();

export class WorkerManager {
  private static instance: WorkerManager;
  private records: Map<string, { worker: Worker; modulePath: string }> =
    new Map();

  private constructor() {}

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  createWorker(name: string, modulePath: string): void {
    if (this.records.has(name)) {
      logger.warn(`Worker with name ${name} already exists, ovewrite`);
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

  static destroyAllWorkers() {
    const instance = WorkerManager.getInstance();
    for (const name of instance.records.keys()) {
      instance.destroyWorker(name);
    }
  }

  static execute(
    name: string,
    run: unknown,
  ): Promise<{ result: unknown; run: unknown }> {
    const instance = WorkerManager.getInstance();

    const record = instance.records.get(name);
    if (!record) {
      throw new Error(`Worker with name ${name} does not exist`);
    }

    const { worker, modulePath } = record;

    return new Promise((resolve, reject) => {
      // listeners
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data as { result: unknown; run: unknown });
        }
      };

      worker.onerror = (err) => reject(err);

      // trigger execution
      worker.postMessage({
        modulePath,
        functionName: name,
        run,
      });
    });
  }
}
