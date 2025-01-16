// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

export type PoolConfig = {
  maxWorkers?: number | null;
  minWorkers?: number | null;
  waitTimeoutMs?: number | null;
};

export type Consumer<T> = (x: T) => void;

export interface WaitQueue<W> {
  push(consumer: Consumer<W>, onCancel: () => void): void;
  shift(produce: () => W): boolean;
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
      this.#timerId = setTimeout(
        this.#timeoutHandler.bind(this),
        timeoutMs,
      );
    } else {
      this.#timerId = null;
    }
  }

  #cancelNextEntry() {
    this.#queue.shift()!.cancellationHandler();
  }

  [Symbol.dispose]() {
    if (this.#timerId != null) {
      clearTimeout(this.#timerId);
    }
  }
}
