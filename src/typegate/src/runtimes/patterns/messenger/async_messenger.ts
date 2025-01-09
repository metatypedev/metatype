// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { getLogger } from "../../../log.ts";
import type { Answer, Message, TaskData } from "./types.ts";
import { maxi32 } from "../../../utils.ts";
import type { TypegateConfigBase } from "../../../config/types.ts";

const logger = getLogger(import.meta);

export type MessengerStart<Broker, A> = (
  receive: (answer: Answer<A>) => Promise<void>,
) => Broker;

export type MessengerSend<Broker, M> = (
  broker: Broker,
  data: Message<M>,
) => Promise<void> | void;

export type MessengerStop<Broker> = (broker: Broker) => Promise<void> | void;

export type AsyncMessengerConfig = Readonly<
  Pick<TypegateConfigBase, "timer_max_timeout_ms" | "timer_destroy_resources">
>;

export class AsyncMessenger<Broker, M, A> {
  protected broker: Broker;
  #counter = 0;
  #tasks: Map<number, TaskData> = new Map();
  #start: MessengerStart<Broker, A>;
  #send: MessengerSend<Broker, M>;
  #stop: MessengerStop<Broker>;

  #timer?: ReturnType<typeof setInterval>;
  #timeoutSecs: number;

  protected constructor(
    start: MessengerStart<Broker, A>,
    send: MessengerSend<Broker, M>,
    stop: MessengerStop<Broker>,
    private config: AsyncMessengerConfig,
  ) {
    this.#start = start;
    this.#send = send;
    this.#stop = stop;
    this.#timeoutSecs = config.timer_max_timeout_ms / 1000;
    // init broker
    this.broker = start(this.receive.bind(this));
  }

  async terminate(): Promise<void> {
    await Promise.all(
      [...this.#tasks.values()].map((t) => {
        clearTimeout(t.timeoutId);
        return t.promise;
      }),
    );
    logger.info(`close worker ${this.constructor.name}`);
    await this.#stop(this.broker);
    clearInterval(this.#timer);
  }

  execute(
    op: string | number | null,
    data: M,
    hooks: Array<() => Promise<void>> = [],
    pulseCount = 0,
  ): Promise<unknown> {
    const id = this.nextId();
    const promise = Promise.withResolvers<unknown>();
    const message = { id, op, data, remainingPulseCount: pulseCount };
    const timeoutId = this.startTaskTimer(message);

    this.#tasks.set(id, { promise, hooks, timeoutId });

    void this.#send(this.broker, message);
    return promise.promise;
  }

  async receive(answer: Answer<A>): Promise<void> {
    const { id } = answer;
    const { promise, hooks, timeoutId } = this.#tasks.get(id)!;

    clearTimeout(timeoutId);

    if (answer.error) {
      promise.reject(new Error(answer.error));
    } else {
      promise.resolve(answer.data);
    }

    await Promise.all(hooks.map((h) => h()));
    this.#tasks.delete(id);
  }

  private startTaskTimer(message: Message<M>) {
    return setTimeout(() => {
      const task = this.#tasks.get(message.id);

      if (!task) return;

      if (
        message.remainingPulseCount !== undefined &&
        message.remainingPulseCount > 0
      ) {
        // check again next time if unterminated
        message.remainingPulseCount -= 1;
        task.timeoutId = this.startTaskTimer(message);
        return;
      }

      // default behavior or 0 pulse left
      const data = JSON.stringify(message, null, 2);
      this.receive({
        id: message.id,
        error: `${this.#timeoutSecs}s timeout exceeded: ${data}`,
      });

      if (this.config.timer_destroy_resources) {
        this.#stop(this.broker);
        logger.info("reset broker after timeout");
        this.broker = this.#start(this.receive.bind(this));
      }
    }, this.config.timer_max_timeout_ms);
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
