// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { getLogger } from "../../../log.ts";
import { maxi32 } from "../../../utils.ts";
import {
  AsyncMessenger,
  MessengerSend,
  MessengerStart,
  MessengerStop,
} from "./async_messenger.ts";

const logger = getLogger(import.meta);

const inactivityThreshold = 1;
const inactivityIntervalMs = 15_000;

export class LazyAsyncMessenger<Broker, M, A>
  extends AsyncMessenger<Broker | null, M, A> {
  #gcState = 0;
  #gcInterval?: number;
  #start: MessengerStart<Broker, A>;

  #ops: Map<number | string, M>;
  #loadedOps: Set<number | string> = new Set();

  constructor(
    start: MessengerStart<Broker, A>,
    ops: Map<number, M>,
    send: MessengerSend<Broker, M>,
    stop: MessengerStop<Broker>,
  ) {
    const lazySend: MessengerSend<Broker | null, M> = async (
      _,
      message,
    ) => {
      if (!this.broker) {
        this.broker = start(
          this.receive.bind(this),
        );
      }
      const { op, remainingPulseCount } = message;
      if (op !== null && !this.#loadedOps.has(op)) {
        const initOp = this.#ops.get(op);
        if (!initOp) {
          throw new Error(`unknown op ${op}`);
        }
        await this.execute(
          null,
          initOp,
          [],
          remainingPulseCount,
        );
        this.#loadedOps.add(op);
      }
      await send(this.broker, message);
    };

    const lazyStop: MessengerStop<Broker | null> = async (_) => {
      clearInterval(this.#gcInterval);
      const broker = this.broker;
      if (broker) {
        this.broker = null;
        this.#loadedOps.clear();
        await stop(broker);
      }
    };

    super(() => null, lazySend, lazyStop);
    this.#start = start;
    this.#ops = ops;
  }

  enableLazyness(): void {
    logger.info(`enable laziness`);
    clearInterval(this.#gcInterval);
    this.#gcInterval = setInterval(
      () => this.checkLazyness(),
      inactivityIntervalMs,
    );
  }

  async checkLazyness(): Promise<void> {
    if (!this.broker) {
      return;
    }

    const activity = (this.counter - this.#gcState + maxi32) %
      maxi32;
    this.#gcState = this.counter;

    if (activity <= inactivityThreshold && this.isEmpty) {
      logger.info(
        `lazy close worker ${this.constructor.name}`,
      );
      this.broker = null;
      await this.terminate();
    }
  }

  disableLazyness(): void {
    logger.info(`disable laziness`);
    clearInterval(this.#gcInterval);
    if (!this.broker) {
      this.broker = this.#start(
        this.receive.bind(this),
      );
    }
  }
}
