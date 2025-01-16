// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import {
  createSimpleWaitQueue,
  PoolConfig,
  WaitQueue,
  WaitQueueWithTimeout,
} from "./pooling.ts";
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

type DeallocateOptions = {
  destroy?: boolean;
  /// defaults to `true`
  /// recreate workers to replace destroyed ones if `.destroy` is `true`.
  /// Set to `false` for deinit.
  ensureMinWorkers?: boolean;
};

export class BaseWorkerManager<
  T,
  M extends BaseMessage,
  E extends BaseMessage,
> {
  #name: string;
  #activeTasks: Map<TaskId, {
    worker: BaseWorker<M, E>;
    taskSpec: T;
  }> = new Map();
  #tasksByName: Map<string, Set<TaskId>> = new Map();
  #startedAt: Map<TaskId, Date> = new Map();
  #poolConfig: PoolConfig;
  // TODO auto-remove idle workers after a certain time
  #idleWorkers: BaseWorker<M, E>[] = [];
  #waitQueue: WaitQueue<BaseWorker<M, E>>;
  #nextWorkerId = 1;

  #workerFactory: () => BaseWorker<M, E>;

  get #workerCount() {
    return this.#idleWorkers.length + this.#activeTasks.size;
  }

  protected constructor(
    name: string,
    workerFactory: (taskId: TaskId) => BaseWorker<M, E>,
    config: PoolConfig = {},
  ) {
    this.#name = name;
    this.#workerFactory = () =>
      workerFactory(`${this.#name} worker #${this.#nextWorkerId++}`);
    this.#poolConfig = config;

    if (config.waitTimeoutMs == null) { // no timeout
      this.#waitQueue = createSimpleWaitQueue();
    } else {
      this.#waitQueue = new WaitQueueWithTimeout(config.waitTimeoutMs ?? 30000);
    }
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

  #nextWorker() {
    const idleWorker = this.#idleWorkers.shift();
    if (idleWorker) {
      return Promise.resolve(idleWorker);
    }
    if (
      this.#poolConfig.maxWorkers == null ||
      this.#activeTasks.size < this.#poolConfig.maxWorkers
    ) {
      return Promise.resolve(this.#workerFactory());
    }
    return this.#waitForWorker();
  }

  #waitForWorker() {
    return new Promise<BaseWorker<M, E>>((resolve, reject) => {
      this.#waitQueue.push(
        (worker) => resolve(worker),
        () =>
          reject(
            new Error("timeout while waiting for a worker to be available"),
          ),
      );
    });
  }

  protected async delegateTask(
    name: string,
    taskId: TaskId,
    taskSpec: T,
  ): Promise<void> {
    const worker = await this.#nextWorker();

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
          `destroying workers for tasks ${
            activeTaskNames.map((w) => `"${w}"`).join(", ")
          }`,
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
      for (const taskId of taskIds) {
        this.deallocateWorker(name, taskId, options);
      }
      return true;
    }
    return false;
  }

  deallocateWorker(
    name: string,
    taskId: TaskId,
    { destroy = false, ensureMinWorkers = true }: DeallocateOptions = {},
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
        task.worker.destroy();

        const taskAdded = this.#waitQueue.shift(() => this.#workerFactory());
        if (!taskAdded) { // no task from the queue
          if (ensureMinWorkers) {
            const { minWorkers } = this.#poolConfig;
            if (minWorkers != null && this.#workerCount < minWorkers) {
              this.#idleWorkers.push(this.#workerFactory());
            }
          }
        }
      } else {
        const taskAdded = this.#waitQueue.shift(() => task.worker);
        if (!taskAdded) { // worker has not been reassigned
          const { maxWorkers } = this.#poolConfig;
          // how?? xD
          // We might add "urgent" tasks in the future;
          // in this case the worker count might exceed `maxWorkers`.
          if (maxWorkers != null && this.#workerCount >= maxWorkers) {
            task.worker.destroy();
          } else {
            this.#idleWorkers.push(task.worker);
          }
        }
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
    this.deallocateAllWorkers({ destroy: true, ensureMinWorkers: false });
    if (this.#idleWorkers.length > 0) {
      logger.warn(
        `destroying idle workers: ${
          this.#idleWorkers.map((w) => `"${w.id}"`).join(", ")
        }`,
      );
      for (const worker of this.#idleWorkers) {
        worker.destroy();
      }
      this.#idleWorkers = [];
    }
    return Promise.resolve();
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
