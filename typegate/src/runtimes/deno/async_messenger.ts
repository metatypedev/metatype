// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { deferred } from "std/async/deferred.ts";
import { getLogger } from "../../log.ts";
import { Answer, Envelop, TaskData } from "./shared_types.ts";
import { maxi32 } from "../../utils.ts";

const logger = getLogger(import.meta);

export type MessengerStart<Broker, A> = (
  receive: (answer: Answer<A> & Envelop) => Promise<void>,
) => Broker;

export type MessengerSend<Broker, M> = (
  broker: Broker,
  id: number,
  op: number | null,
  message: M,
) => Promise<void>;

export type MessengerStop<Broker> = (broker: Broker) => Promise<void>;

export class AsyncMessenger<Broker, M, A> {
  protected broker: Broker;
  #counter = 0;
  #tasks: Map<number, TaskData> = new Map();
  #send: MessengerSend<Broker, M>;
  #stop: MessengerStop<Broker>;

  protected constructor(
    broker: Broker,
    send: MessengerSend<Broker, M>,
    stop: MessengerStop<Broker>,
  ) {
    this.broker = broker;
    this.#send = send;
    this.#stop = stop;
  }

  async terminate(): Promise<void> {
    await Promise.all([...this.#tasks.values()].map((t) => t.promise));
    logger.info(`close worker ${this.constructor.name}`);
    this.#stop(this.broker);
  }

  execute(
    op: number | null,
    task: M,
    hooks: Array<() => Promise<void>> = [],
  ): Promise<unknown> {
    const id = this.nextId();
    const promise = deferred<unknown>();
    this.#tasks.set(id, { promise, hooks });
    void this.#send(this.broker, id, op, task);
    return promise;
  }

  async receive(answer: Answer<A> & Envelop): Promise<void> {
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
