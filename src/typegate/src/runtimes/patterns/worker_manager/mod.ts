// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import { BaseMessage, EventHandler, TaskId } from "./types.ts";

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

  // allocate worker?
  protected createWorker(name: string, taskId: TaskId, taskSpec: T) {
    const worker = this.#workerFactory(taskId);
    // TODO inline
    this.addWorker(name, taskId, worker, taskSpec, new Date());
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

  logMessage(_taskId: TaskId, _msg: M) {
    // default implementation is empty
  }

  sendMessage(taskId: TaskId, msg: M) {
    const { worker } = this.getTask(taskId);
    worker.send(msg);
    this.logMessage(taskId, msg);
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
