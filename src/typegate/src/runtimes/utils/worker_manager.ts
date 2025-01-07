// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { envSharedWithWorkers } from "../../config/shared.ts";

export type RunId = string;
export type WorkerEventHandler = (message: Result<unknown>) => Promise<void>;
export type AnyString = string & Record<string | number | symbol, never>;
export type WorkerEvent = "START" | AnyString;
export type Result<T> = {
  error: boolean;
  payload: T;
};
export function Ok<R>(payload: R): Result<R> {
  return { error: false, payload };
}

export function Err<E>(payload: E): Result<E> {
  return { error: true, payload };
}

export type WorkerData = {
  type: WorkerEvent;
  data: any;
};

export function Msg(type: WorkerEvent, data: unknown): WorkerData {
  return { type, data };
}

export abstract class BaseWorker {
  abstract listen(handlerFn: WorkerEventHandler): void;
  abstract trigger(type: WorkerEvent, data: unknown): void;
  abstract destroy(): void;
  abstract get id(): RunId;
}

export class DenoWorker {
  #worker: Worker;
  #runId: RunId;
  constructor(runId: RunId, workerPath: string) {
    this.#worker = new Worker(workerPath, {
      name: runId,
      type: "module",
      deno: {
        permissions: {
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
    this.#runId = runId;
  }

  listen(handlerFn: WorkerEventHandler) {
    this.#worker.onmessage = async (message) => {
      if (message.data.error) {
        // worker level failure
        await handlerFn(Err(message.data.error));
      } else {
        // logic level Result (Ok | Err)
        await handlerFn(message.data as Result<unknown>);
      }
    };

    this.#worker.onerror = /*async*/ (event) => handlerFn(Err(event));
  }

  trigger(type: WorkerEvent, data: unknown) {
    this.#worker.postMessage(Msg(type, data));
  }

  destroy() {
    this.#worker.terminate();
  }

  get id() {
    return this.#runId;
  }
}

export class BaseWorkerManager {
  #workerFactory: (runId: RunId) => BaseWorker;
  protected constructor(workerFactory: (runId: RunId) => BaseWorker) {
    this.#workerFactory = workerFactory;
  }

  get workerFactory() {
    return this.#workerFactory;
  }
}
