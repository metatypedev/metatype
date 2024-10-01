// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// FIXME: DO NOT IMPORT any file that refers to Meta, this will be instantiated in a Worker
// import { sleep } from "../../utils.ts"; // will silently fail??

import { Interrupt, OperationEvent, Run } from "./types.ts";

export class Context {
  private id: number = 0;
  constructor(private run: Run, private kwargs: Record<string, unknown>) {}

  #nextId() {
    // IDEA: this scheme does not account the step provided
    // Different args => potentially different step (notably for Save)
    this.id += 1;
    return this.id;
  }

  #appendOp(op: OperationEvent) {
    this.run.operations.push({ at: new Date().toJSON(), event: op });
  }

  async save<T>(fn: () => T | Promise<T>, option?: SaveOption) {
    const id = this.#nextId();

    let currRetryCount = 1;
    for (const { event } of this.run.operations) {
      if (event.type == "Save" && id == event.id) {
        if (event.value.type == "Resolved") {
          return event.value.payload;
        } else if (event.value.type == "Retry") {
          const delay = new Date(event.value.wait_until);
          if (delay.getTime() > new Date().getTime()) {
            // Too soon!
            throw Interrupt.Variant("SAVE_RETRY");
          } else {
            currRetryCount = event.value.counter;
          }
        }
      }
    }

    // current call +1
    currRetryCount += 1;

    try {
      let result: any;
      if (option?.timeout && option.timeout > 0) {
        result = await Promise.race([fn(), failAfter(option.timeout)]);
      } else {
        result = await Promise.resolve(fn());
      }

      this.#appendOp({
        type: "Save",
        id,
        value: {
          type: "Resolved",
          payload: result,
        },
      });

      return result;
    } catch (err) {
      if (
        option?.retry?.maxRetries &&
        currRetryCount < option.retry.maxRetries
      ) {
        const { retry } = option;
        const strategy = new RetryStrategy(
          retry.maxRetries,
          retry.initBackoff,
          retry.maxBackoff
        );

        const retriesLeft = Math.max(retry.maxRetries - currRetryCount, 0);
        const delaySec = strategy.eval(retry.strategy ?? "linear", retriesLeft);

        this.#appendOp({
          type: "Save",
          id,
          value: {
            type: "Retry",
            wait_until: new Date(
              new Date().getTime() + 1000 * delaySec
            ).toJSON(),
            counter: currRetryCount,
          },
        });

        throw Interrupt.Variant("SAVE_RETRY");
      } else {
        this.#appendOp({
          type: "Save",
          id,
          value: {
            type: "Failed",
            err: {
              retries: currRetryCount,
              message: err?.message ?? `${err}`,
            },
          },
        });
      }

      throw err;
    }
  }

  sleep(durationMs: number) {
    const id = this.#nextId();
    for (const { event } of this.run.operations) {
      if (event.type == "Sleep" && id == event.id) {
        const end = new Date(event.end);
        if (end.getTime() <= new Date().getTime()) {
          return;
        } else {
          throw Interrupt.Variant("SLEEP");
        }
      }
    }

    const start = new Date();
    const end = new Date(start.getTime() + durationMs);
    this.#appendOp({
      type: "Sleep",
      id,
      start: start.toJSON(),
      end: end.toJSON(),
    });
    throw Interrupt.Variant("SLEEP");
  }

  getRun() {
    return this.run;
  }

  appendEvent(event_name: string, payload: unknown) {
    this.#appendOp({
      type: "Send",
      event_name,
      value: payload,
    });
  }

  receive(eventName: string) {
    for (const { event } of this.run.operations) {
      if (event.type == "Send" && event.event_name == eventName) {
        return event.value;
      }
    }

    throw Interrupt.Variant("WAIT_RECEIVE_EVENT");
  }

  async handle(
    eventName: string,
    fn: (received: unknown) => unknown | Promise<unknown>
  ) {
    for (const { event } of this.run.operations) {
      if (event.type == "Send" && event.event_name == eventName) {
        const payload = event.value;
        return await fn(payload);
      }
    }

    throw Interrupt.Variant("WAIT_HANDLE_EVENT");
  }

  async ensure(conditionFn: () => boolean | Promise<boolean>) {
    const result = await conditionFn();
    if (!result) {
      throw Interrupt.Variant("WAIT_ENSURE_VALUE");
    }

    return result;
  }
}

// TODO: move all of these into substantial lib once Meta can be used in a worker working
// #[serde(....)]
// pub enum RetryStrategy { Linear {...}, Exp { ... }}
// impl RetryStrategy { pub fn eval(&self, retries_left: i8) { .. }}

type StrategyAlgorithm = "linear";

interface SaveOption {
  timeout?: number;
  retry?: {
    strategy?: "linear"; // TODO: add more
    initBackoff: number;
    maxBackoff: number;
    maxRetries: number;
  };
}

async function failAfter(ms: number): Promise<never> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

  throw Interrupt.Variant("SAVE_TIMEOUT");
}

class RetryStrategy {
  initBackoff?: number;
  maxBackoff?: number;
  maxRetries: number;

  constructor(maxRetries: number, initBackoff?: number, maxBackoff?: number) {
    this.maxRetries = maxRetries;
    this.initBackoff = initBackoff;
    this.maxBackoff = maxBackoff;

    if (this.maxRetries < 1) {
      throw new Error("maxRetries < 1");
    }

    const low = this.initBackoff;
    const high = this.maxBackoff;

    if (low && high) {
      if (low >= high) {
        throw new Error("initBackoff >= maxBackoff");
      }
      if (low < 0) {
        throw new Error("initBackoff < 0");
      }
    } else if (low && high == undefined) {
      this.maxBackoff = low + 10;
    } else if (low == undefined && high) {
      this.initBackoff = Math.max(0, high - 10);
    }
  }

  eval(strategy: StrategyAlgorithm, retriesLeft: number) {
    switch (strategy) {
      case "linear":
        return this.#linear(retriesLeft);
      // TODO: add more
      default:
        throw new Error(`Unknown strategy "${strategy}" provided`);
    }
  }

  #linear(retriesLeft: number): number {
    if (retriesLeft <= 0) {
      throw new Error("retries left <= 0");
    }

    const dt = (this.maxBackoff ?? 0) - (this.initBackoff ?? 0);
    return Math.floor(((this.maxRetries - retriesLeft) * dt) / this.maxRetries);
  }
}
