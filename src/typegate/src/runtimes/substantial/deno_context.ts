// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// FIXME: DO NOT IMPORT any file that refers to Meta, this will be instantiated in a Worker
// import { sleep } from "../../utils.ts"; // will silently fail??

import { Interrupt, OperationEvent, Run, appendIfOngoing } from "./types.ts";

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
    appendIfOngoing(this.run, { at: new Date().toJSON(), event: op });
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

    // current call already counts
    currRetryCount += 1;

    try {
      let result: any;
      if (option?.timeoutMs && option.timeoutMs > 0) {
        result = await Promise.race([fn(), failAfter(option.timeoutMs)]);
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
          retry.minBackoffMs,
          retry.maxBackoffMs
        );

        const retriesLeft = Math.max(retry.maxRetries - currRetryCount, 0);
        const delayMs = strategy.eval(retry.strategy ?? "linear", retriesLeft);
        const waitUntilAsMs = new Date().getTime() + delayMs;

        this.#appendOp({
          type: "Save",
          id,
          value: {
            type: "Retry",
            wait_until: new Date(waitUntilAsMs).toJSON(),
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

// TODO: move all of these into substantial lib once Meta can be used inside workers
// ```rust
// #[serde(....)]
// pub enum RetryStrategy { Linear {...}, Exp { ... }}
// impl RetryStrategy { pub fn eval(&self, retries_left: i8) { .. }}
//
// ```

type Strategy = "linear";

interface SaveOption {
  timeoutMs?: number;
  retry?: {
    strategy?: Strategy; // TODO: add more
    minBackoffMs: number;
    maxBackoffMs: number;
    maxRetries: number;
  };
}

function failAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(Error("Save timed out"));
    }, ms);
  });
}

class RetryStrategy {
  minBackoffMs?: number;
  maxBackoffMs?: number;
  maxRetries: number;

  constructor(
    maxRetries: number,
    minBackoffMs?: number,
    maxBackoffMs?: number
  ) {
    this.maxRetries = maxRetries;
    this.minBackoffMs = minBackoffMs;
    this.maxBackoffMs = maxBackoffMs;

    if (this.maxRetries < 1) {
      throw new Error("maxRetries < 1");
    }

    const low = this.minBackoffMs;
    const high = this.maxBackoffMs;

    if (low && high) {
      if (low >= high) {
        throw new Error("minBackoffMs >= maxBackoffMs");
      }
      if (low < 0) {
        throw new Error("minBackoffMs < 0");
      }
    } else if (low && high == undefined) {
      this.maxBackoffMs = low + 10;
    } else if (low == undefined && high) {
      this.minBackoffMs = Math.max(0, high - 10);
    }
  }

  eval(strategy: Strategy, retriesLeft: number) {
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

    const dt = (this.maxBackoffMs ?? 0) - (this.minBackoffMs ?? 0);
    return Math.floor(((this.maxRetries - retriesLeft) * dt) / this.maxRetries);
  }
}
