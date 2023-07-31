// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { deferred } from "std/async/deferred.ts";
import { getLogger } from "../../../log.ts";
import { Answer, Message, TaskData } from "./types.ts";
import { maxi32 } from "../../../utils.ts";
import { BinaryHeap } from "std/collections/binary_heap.ts";
import config from "../../../config.ts";

const logger = getLogger(import.meta);

export type MessengerStart<Broker, A> = (
  receive: (answer: Answer<A>) => Promise<void>,
) => Broker;

export type MessengerSend<Broker, M> = (
  broker: Broker,
  data: Message<M>,
) => Promise<void> | void;

export type MessengerStop<Broker> = (broker: Broker) => Promise<void> | void;

export class AsyncMessenger<Broker, M, A> {
  protected broker: Broker;
  #counter = 0;
  #tasks: Map<number, TaskData> = new Map();
  #send: MessengerSend<Broker, M>;
  #stop: MessengerStop<Broker>;

  #timer?: ReturnType<typeof setInterval>;
  #pendingOperations: BinaryHeap<
    { date: number; message: Message<M> }
  > = new BinaryHeap((a, b) => a.date - b.date); // min date always at top
  #doneIds: Set<number> = new Set<number>();

  protected constructor(
    broker: Broker,
    send: MessengerSend<Broker, M>,
    stop: MessengerStop<Broker>,
  ) {
    this.broker = broker;
    this.#send = send;
    this.#stop = stop;
    this.initTimer();
  }

  async terminate(): Promise<void> {
    await Promise.all([...this.#tasks.values()].map((t) => t.promise));
    logger.info(`close worker ${this.constructor.name}`);
    this.#stop(this.broker);
    clearInterval(this.#timer);
  }

  initTimer() {
    if (this.#timer === undefined) {
      this.#timer = setInterval(() => {
        const currentDate = Date.now();
        const item = this.#pendingOperations.peek(); // O(1)
        if (item !== undefined) {
          // safe removal
          const delta = currentDate - item.date;
          if (this.#doneIds.has(item.message.id)) {
            this.#pendingOperations.pop(); // O(log N)
            this.#doneIds.delete(item.message.id); // O(1)
            return;
          }

          // force removal
          const maxDurationMs = config.timer_max_timeout_ms;
          if (delta >= maxDurationMs) {
            this.receive({
              id: item.message.id,
              error: `${maxDurationMs / 1000}s timeout exceeded (+${
                (delta - maxDurationMs) / 1000
              }s)`,
            });
            this.#pendingOperations.pop(); // O(log N)

            if (config.timer_destroy_ressources) {
              this.#stop(this.broker); // force abort
            } // else: let the process owner destroy the ressources
          }
        }
      }, config.timer_tick_ms);
    }
  }

  execute(
    op: string | number | null,
    data: M,
    hooks: Array<() => Promise<void>> = [],
  ): Promise<unknown> {
    const id = this.nextId();
    const promise = deferred<unknown>();
    this.#tasks.set(id, { promise, hooks });

    const message = { id, op, data };
    this.#pendingOperations.push({
      date: Date.now(),
      message,
    });
    void this.#send(this.broker, message);
    return promise;
  }

  async receive(answer: Answer<A>): Promise<void> {
    const { id } = answer;
    const { promise, hooks } = this.#tasks.get(id)!;
    this.#doneIds.add(answer.id); // safe remove
    if (answer.error) {
      promise.reject(new Error(answer.error));
    } else {
      promise.resolve(answer.data);
    }
    await Promise.all(hooks.map((h) => h()));
    this.#tasks.delete(id);
  }

  private nextId(): number {
    const n = this.#counter;
    this.#counter += 1;
    this.#counter %= maxi32;
    return n;
  }

  get isEmpty(): boolean {
    return this.#tasks.size === 0;
  }

  get counter(): number {
    return this.#counter;
  }
}
