// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { BaseWorker, BaseWorkerManager } from "./mod.ts";
import type { BaseMessage } from "./types.ts";
import { getLogger } from "../../../log.ts";

const logger = getLogger(import.meta, "WARN");

export type PoolConfig = {
  // non-negative integer; 0 means no limit
  maxWorkers: number;
  // non-negative integer; must be less than or equal to `maxWorkers` if maxWorkers is not 0
  minWorkers: number;
  // non-negative integer; 0 means no timeout
  waitTimeoutMs: number;
};

export type Consumer<T> = (x: T) => void;

export interface WaitQueue<W> {
  push(consumer: Consumer<W>, onCancel: () => void): void;
  shift(produce: () => W): boolean;
  clear(): void;
}

export function createSimpleWaitQueue<W>(): WaitQueue<W> {
  const queue: Array<Consumer<W>> = [];
  return {
    push(consumer, _onCancel) {
      queue.push(consumer);
    },
    shift(produce) {
      const consumer = queue.shift();
      if (consumer) {
        consumer(produce());
        return true;
      }
      return false;
    },
    clear() {},
  };
}

export class WaitQueueWithTimeout<W> implements WaitQueue<W> {
  #queue: Array<{
    consumer: Consumer<W>;
    cancellationHandler: () => void;
    addedAt: number; // timestamp
  }> = [];
  #timerId: number | null = null;
  #waitTimeoutMs: number;

  constructor(timeoutMs: number) {
    this.#waitTimeoutMs = timeoutMs;
  }

  push(consumer: Consumer<W>, onCancel: () => void) {
    this.#queue.push({
      consumer,
      cancellationHandler: onCancel,
      addedAt: Date.now(),
    });
    if (this.#timerId == null) {
      if (this.#queue.length !== 1) {
        throw new Error("unreachable: inconsistent state: no active timer");
      }
      this.#updateTimer();
    }
  }

  shift(produce: () => W) {
    const entry = this.#queue.shift();
    if (entry) {
      entry.consumer(produce());
      return true;
    }
    return false;
  }

  clear() {
    if (this.#timerId != null) {
      clearTimeout(this.#timerId);
    }
  }

  #timeoutHandler() {
    this.#cancelNextEntry();
    this.#updateTimer();
  }

  #updateTimer() {
    if (this.#queue.length > 0) {
      const timeoutMs = this.#queue[0].addedAt + this.#waitTimeoutMs -
        Date.now();
      if (timeoutMs <= 0) {
        this.#cancelNextEntry();
        this.#updateTimer();
        return;
      }
      this.#timerId = setTimeout(this.#timeoutHandler.bind(this), timeoutMs);
    } else {
      this.#timerId = null;
    }
  }

  #cancelNextEntry() {
    this.#queue.shift()?.cancellationHandler();
  }

  [Symbol.dispose]() {
    this.clear();
  }
}

/// W is the worker type
/// R is the manager type
export class WorkerPool<
  T,
  M extends BaseMessage,
  E extends BaseMessage,
  W extends BaseWorker<M, E> = BaseWorker<M, E>,
  G extends BaseWorkerManager<T, M, E> = BaseWorkerManager<T, M, E>,
> {
  #config: PoolConfig;
  // TODO auto-remove idle workers after a certain time
  #idleWorkers: Array<W> = [];
  #busyWorkers: Map<string, G> = new Map();
  #waitQueue: WaitQueue<W>;
  #workerFactory: () => W;
  #nextWorkerId = 1;

  constructor(name: string, config: PoolConfig, factory: (id: string) => W) {
    if (config.maxWorkers != 0 && config.minWorkers > config.maxWorkers) {
      throw new Error(
        "Worker pool configuration error: maxWorkers must be greater than or equal to minWorkers or be 0",
      );
    }

    this.#config = config;
    this.#workerFactory = () =>
      factory(`${name} worker #${this.#nextWorkerId++}`);

    if (config.waitTimeoutMs === 0) {
      // no timeout
      this.#waitQueue = createSimpleWaitQueue();
    } else {
      this.#waitQueue = new WaitQueueWithTimeout(config.waitTimeoutMs);
    }
  }

  #lendWorkerTo(worker: W, manager: G): W {
    this.#busyWorkers.set(worker.id, manager);
    return worker;
  }

  borrowWorker(manager: G) {
    const idleWorker = this.#idleWorkers.shift();
    if (idleWorker) {
      return Promise.resolve(this.#lendWorkerTo(idleWorker, manager));
    }
    if (
      this.#config.maxWorkers === 0 ||
      this.#busyWorkers.size < this.#config.maxWorkers
    ) {
      return Promise.resolve(
        this.#lendWorkerTo(this.#workerFactory(), manager),
      );
    }

    // wait for a worker to become available
    return new Promise<W>((resolve, reject) => {
      this.#waitQueue.push(
        (worker) => resolve(this.#lendWorkerTo(worker, manager)),
        () =>
          reject(
            new Error("timeout while waiting for a worker to be available"),
          ),
      );
    });
  }

  // ensureMinWorkers will be false when we are shutting down.
  unborrowWorker(worker: W) {
    this.#busyWorkers.delete(worker.id);
    const taskAdded = this.#waitQueue.shift(() => worker);
    if (!taskAdded) {
      // worker has not been reassigned
      const { maxWorkers } = this.#config;
      // how?? xD
      // We might add "urgent" tasks in the future;
      // in this case the worker count might exceed `maxWorkers`.
      if (maxWorkers !== 0 && this.#workerCount >= maxWorkers) {
        worker.destroy();
      } else {
        this.#idleWorkers.push(worker);
      }
    }
  }

  // when shutdown is true, new tasks will not be dequeued
  destroyWorker(worker: W, shutdown = false) {
    this.#busyWorkers.delete(worker.id);
    worker.destroy();
    if (!shutdown) {
      const taskAdded = this.#waitQueue.shift(() => this.#workerFactory());
      if (!taskAdded) {
        // queue was empty: worker not reassigned
        const { minWorkers } = this.#config;
        if (this.#workerCount < minWorkers) {
          this.#idleWorkers.push(this.#workerFactory());
        }
      }
    }
  }

  get #workerCount() {
    return this.#idleWorkers.length + this.#busyWorkers.size;
  }

  clear() {
    logger.info(
      `destroying idle workers`,
      this.#idleWorkers
        .map((w) => `"${w.id}"`),
    );
    this.#idleWorkers.forEach((worker) => worker.destroy());
    this.#idleWorkers = [];
    this.#waitQueue.clear();
  }
}
