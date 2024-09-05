// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

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

  async save<T>(fn: () => T | Promise<T>) {
    const id = this.#nextId();

    for (const { event } of this.run.operations) {
      if (event.type == "Save" && id == event.id) {
        // console.log("skip #", id, event.value);
        return event.value;
      }
    }

    const result = await Promise.resolve(fn());
    this.#appendOp({
      type: "Save",
      id,
      value: result,
    });
    return result;
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

  start() {
    this.#appendOp({
      type: "Start",
      kwargs: this.kwargs,
    });
  }

  stop(nativeRustResultType: "Ok" | "Err", result?: unknown) {
    this.#appendOp({
      type: "Stop",
      result: {
        [nativeRustResultType]: result,
      },
    });
  }

  event(event_name: string, payload: unknown) {
    this.#appendOp({
      type: "Send",
      event_name,
      value: payload,
    });
  }
}
