// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { envSharedWithWorkers } from "../../../config/shared.ts";
import { BaseWorker } from "./mod.ts";
import { BaseMessage, EventHandler } from "./types.ts";

export interface DenoWorkerError extends BaseMessage {
  type: "WORKER_ERROR";
  event: ErrorEvent;
}

export type BaseDenoWorkerMessage = BaseMessage | DenoWorkerError;

export class DenoWorker<M extends BaseMessage, E extends BaseDenoWorkerMessage>
  extends BaseWorker<M, E> {
  #worker: Worker;
  #workerId: string;
  constructor(workerId: string, workerPath: string) {
    super();
    this.#worker = new Worker(workerPath, {
      name: workerId,
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
    this.#workerId = workerId;
  }

  listen(handlerFn: EventHandler<E>) {
    this.#worker.onmessage = async (message) => {
      await handlerFn(message.data as E);
    };

    this.#worker.onerror = async (event) => {
      await handlerFn(
        {
          type: "WORKER_ERROR",
          event,
        } as E,
      );
    };
  }

  send(msg: M) {
    this.#worker.postMessage(msg);
  }

  destroy() {
    this.#worker.terminate();
  }

  get id() {
    return this.#workerId;
  }
}
