// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { envSharedWithWorkers } from "../../config/shared.ts";
import { getLogger } from "../../log.ts";

const logger = getLogger(import.meta, "WARN");

export type TaskId = string;
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

export interface BaseMessage {
  type: string;
}

export interface WorkerError extends BaseMessage {
  type: "WORKER_ERROR";
  event: ErrorEvent;
}

export type BaseDenoWorkerMessage = BaseMessage | WorkerError;

// TODO failure as message type instead of result
export type EventHandler<E extends BaseMessage> = (
  message: E,
) => void | Promise<void>;

/**
 * `M` is the message type that the worker will receive;
 * `E` is the message type that the worker will send back (event).
 */
export abstract class BaseWorker<M extends BaseMessage, E extends BaseMessage> {
  abstract listen(handlerFn: EventHandler<E>): void;
  abstract send(msg: M): void;
  abstract destroy(): void;
  abstract get id(): TaskId;
}

export class DenoWorker<M extends BaseMessage, E extends BaseDenoWorkerMessage>
  extends BaseWorker<M, E> {
  #worker: Worker;
  #taskId: TaskId;
  constructor(taskId: TaskId, workerPath: string) {
    super();
    this.#worker = new Worker(workerPath, {
      name: taskId,
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
    this.#taskId = taskId;
  }

  listen(handlerFn: EventHandler<E>) {
    this.#worker.onmessage = async (message) => {
      await handlerFn(message.data as E);
    };

    this.#worker.onerror = /*async*/ (event) =>
      handlerFn(
        {
          type: "WORKER_ERROR",
          event,
        } as E,
      );
  }

  send(msg: M) {
    this.#worker.postMessage(msg);
  }

  destroy() {
    this.#worker.terminate();
  }

  get id() {
    return this.#taskId;
  }
}

export class BaseWorkerManager<
  T,
  M extends BaseMessage,
  E extends BaseMessage,
> {
  #activeTasks: Map<TaskId, {
    worker: BaseWorker<M, E>;
    taskSpec: T;
  }> = new Map();
  #tasksByName: Map<string, Set<TaskId>> = new Map();
  #startedAt: Map<TaskId, Date> = new Map();

  #workerFactory: (taskId: TaskId) => BaseWorker<M, E>;
  protected constructor(workerFactory: (taskId: TaskId) => BaseWorker<M, E>) {
    this.#workerFactory = workerFactory;
  }

  get workerFactory() {
    return this.#workerFactory;
  }

  protected getActiveTaskNames() {
    return Array.from(this.#tasksByName.keys());
  }

  protected hasTask(taskId: TaskId) {
    return this.#activeTasks.has(taskId);
  }

  protected getTask(taskId: TaskId) {
    const task = this.#activeTasks.get(taskId);
    if (!task) {
      throw new Error(`Task "${taskId}" does not exist or has been completed`);
    }
    return task;
  }

  protected getTasksByName(name: string) {
    return this.#tasksByName.get(name) ?? new Set();
  }

  getInitialTimeStartedAt(taskId: TaskId) {
    const startedAt = this.#startedAt.get(taskId);
    if (!startedAt) {
      throw new Error(
        `Invalid state: cannot find initial time for task "${taskId}"`,
      );
    }
    return startedAt;
  }

  protected addWorker(
    name: string,
    taskId: TaskId,
    worker: BaseWorker<M, E>,
    taskSpec: T,
    startedAt: Date,
  ) {
    if (!this.#tasksByName.has(name)) {
      this.#tasksByName.set(name, new Set());
    }

    this.#tasksByName.get(name)!.add(taskId);
    this.#activeTasks.set(taskId, { worker, taskSpec });
    if (!this.#startedAt.has(taskId)) {
      this.#startedAt.set(taskId, startedAt);
    }
  }

  protected destroyAllWorkers() {
    for (const name of this.getActiveTaskNames()) {
      this.destroyWorkersByName(name);
    }
  }

  protected destroyWorkersByName(name: string) {
    const taskIds = this.#tasksByName.get(name);
    if (taskIds) {
      for (const taskId of taskIds) {
        this.destroyWorker(name, taskId);
      }
      return true;
    }
    return false;
  }

  protected destroyWorker(name: string, taskId: TaskId) {
    const task = this.#activeTasks.get(taskId);
    if (this.#tasksByName.has(name)) {
      if (!task) {
        logger.warn(
          `Task "${taskId}" associated with "${name}" does not exist or has been already destroyed`,
        );
        return false;
      }

      task.worker.destroy();
      this.#activeTasks.delete(taskId);
      this.#tasksByName.get(name)!.delete(taskId);
      // startedAt records are not deleted

      return true;
    }

    return false;
  }
}
