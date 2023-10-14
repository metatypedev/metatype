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

export class AsyncMessenger<Broker, M, A> {
  protected broker: Broker;
  #counter = 0;
  #tasks: Map<number, TaskData> = new Map();
  #start: MessengerStart<Broker, A>;
  #send: MessengerSend<Broker, M>;
  #stop: MessengerStop<Broker>;

  #timer?: ReturnType<typeof setInterval>;

  #operationQueues: Array<Array<Message<M>>> = [
    [],
    [],
  ];
  #queueIndex = 0;

  protected constructor(
    start: MessengerStart<Broker, A>,
    send: MessengerSend<Broker, M>,
    stop: MessengerStop<Broker>,
  ) {
    this.#start = start;
    this.#send = send;
    this.#stop = stop;
    // init broker
    this.broker = start(this.receive.bind(this));
    this.initTimer();
  }

  async terminate(): Promise<void> {
    await Promise.all([...this.#tasks.values()].map((t) => t.promise));
    logger.info(`close worker ${this.constructor.name}`);
    await this.#stop(this.broker);
    clearInterval(this.#timer);
  }

  initTimer() {
    if (this.#timer === undefined) {
      this.#timer = setInterval(() => {
        const currentQueue = this.#operationQueues[this.#queueIndex];
        this.#queueIndex = 1 - this.#queueIndex;

        let shouldStop = false;
        for (const item of currentQueue) {
          if (this.#tasks.has(item.id)) {
            this.receive({
              id: item.id,
              error: `${config.timer_max_timeout_ms / 1000}s timeout exceeded`,
            });
            shouldStop = true;
          }
        }

        if (shouldStop && config.timer_destroy_ressources) {
          this.#stop(this.broker);
          logger.info("reset broker after timeout");
          this.broker = this.#start(this.receive.bind(this));
        }
      }, config.timer_max_timeout_ms);
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
    this.#operationQueues[this.#queueIndex].push(message);
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
