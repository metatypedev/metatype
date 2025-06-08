// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import type { WorkerPool } from "./pooling.ts";
import type { BaseMessage, EventHandler, TaskId } from "./types.ts";

const logger = getLogger(import.meta, "WARN");

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

type DeallocateOptions = {
  destroy?: boolean;
  // only relevant if destroy is true; if true, no pending task will be dequeued
  shutdown?: boolean;
};

export class BaseWorkerManager<
  T,
  M extends BaseMessage,
  E extends BaseMessage,
> {
  #activeTasks: Map<
    TaskId,
    {
      worker: BaseWorker<M, E>;
      taskSpec: T;
    }
  > = new Map();
  #tasksByName: Map<string, Set<TaskId>> = new Map();
  #startedAt: Map<TaskId, Date> = new Map();
  #pool: WorkerPool<T, M, E>;

  protected constructor(pool: WorkerPool<T, M, E>) {
    this.#pool = pool;
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

  protected async delegateTask(
    name: string,
    taskId: TaskId,
    taskSpec: T,
  ): Promise<void> {
    const worker = await this.#pool.borrowWorker(this);

    if (!this.#tasksByName.has(name)) {
      this.#tasksByName.set(name, new Set());
    }

    this.#tasksByName.get(name)!.add(taskId);
    this.#activeTasks.set(taskId, { worker, taskSpec });
    if (!this.#startedAt.has(taskId)) {
      this.#startedAt.set(taskId, new Date());
    }
  }

  protected deallocateAllWorkers(options: DeallocateOptions = {}) {
    const activeTaskNames = this.getActiveTaskNames();
    if (activeTaskNames.length > 0) {
      if (options.destroy) {
        logger.warn(
          `destroying workers for tasks ${activeTaskNames
            .map((w) => `"${w}"`)
            .join(", ")}`,
        );
      }

      for (const name of activeTaskNames) {
        this.deallocateWorkersByName(name, options);
      }
    }
  }

  protected deallocateWorkersByName(
    name: string,
    options: DeallocateOptions = {},
  ) {
    const taskIds = this.#tasksByName.get(name);
    if (taskIds) {
      for (const id of taskIds) {
        this.deallocateWorker(name, id, options);
      }
      return true;
    }
    return false;
  }

  deallocateWorker(
    name: string,
    taskId: TaskId,
    { destroy = false, shutdown = false }: DeallocateOptions = {},
  ) {
    const task = this.#activeTasks.get(taskId);
    if (this.#tasksByName.has(name)) {
      if (!task) {
        logger.warn(
          `Task "${taskId}" associated with "${name}" does not exist or has been already destroyed`,
        );
        return false;
      }

      this.#activeTasks.delete(taskId);
      this.#tasksByName.get(name)!.delete(taskId);
      // startedAt records are not deleted

      if (destroy) {
        this.#pool.destroyWorker(task.worker, shutdown);
      } else {
        this.#pool.unborrowWorker(task.worker);
      }

      return true;
    }

    logger.warn(`Task with name "${name}" does not exist`);
    return false;
  }

  logMessage(_taskId: TaskId, _msg: M) {
    // default implementation is empty
  }

  sendMessage(taskId: TaskId, msg: M) {
    const { worker } = this.getTask(taskId);
    worker.send(msg);
    this.logMessage(taskId, msg);
  }

  deinit() {
    this.deallocateAllWorkers({ destroy: true, shutdown: true });
    this.#pool.clear(); // this will be called more than once, but that is ok
  }
}

export function createTaskId(name: string) {
  const uuid = crypto.randomUUID();
  const sanitizedName = name.replace(/_::_/g, "__");
  return `${sanitizedName}_::_${uuid}`;
}

export function getTaskNameFromId(taskId: TaskId) {
  const [name, uuid] = taskId.split("_::_");
  if (!name || !uuid) {
    // unreachable
    throw new Error(`Fatal: task ID ${taskId} does not respect the convention`);
  }

  return name;
}
