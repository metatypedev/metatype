// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { deferred } from "std/async/deferred.ts";
import { getLogger } from "../../../log.ts";
import { Answer, Message, TaskData } from "./types.ts";
import { maxi32 } from "../../../utils.ts";
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

export type PendingOperation<M> = {
  date: number;
  message: Message<M>;
};

export class AsyncMessenger<Broker, M, A> {
  protected broker: Broker;
  #counter = 0;
  #tasks: Map<number, TaskData> = new Map();
  #send: MessengerSend<Broker, M>;
  #stop: MessengerStop<Broker>;

  #timer?: ReturnType<typeof setInterval>;

  #operationQueues: Array<Array<PendingOperation<M>>> = [
    [],
    [],
  ];
  #queueIndex = 0;

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
        const currentQueue = this.#operationQueues[this.#queueIndex];
        this.#queueIndex = this.#queueIndex == 0 ? 1 : 0;

        const item = currentQueue[0];
        if (item !== undefined) {
          if (!this.#tasks.has(item.message.id)) {
            console.log(this.#operationQueues.map((q) => q.length));
            // safe removal
            currentQueue.shift();
          } else {
            const delta = Date.now() - item.date;
            // force removal
            const maxDurationMs = config.timer_max_timeout_ms;
            if (delta >= maxDurationMs) {
              console.log(this.#operationQueues.map((q) => q.length));
              currentQueue.shift();
              this.receive({
                id: item.message.id,
                error: `${maxDurationMs / 1000}s timeout exceeded (+${
                  (delta - maxDurationMs) / 1000
                }s)`,
              });
              if (config.timer_destroy_ressources) {
                this.#stop(this.broker); // force abort
              } // else: let the process owner destroy the ressources
            }
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
    // keep the queues evenly balanced
    this.#queueIndex = this.#queueIndex == 0 ? 1 : 0;
    this.#operationQueues[this.#queueIndex].push({
      date: Date.now(),
      message,
    });
    void this.#send(this.broker, message);
    return promise;
  }

  async receive(answer: Answer<A>): Promise<void> {
    const { id } = answer;
    const { promise, hooks } = this.#tasks.get(id)!;
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
