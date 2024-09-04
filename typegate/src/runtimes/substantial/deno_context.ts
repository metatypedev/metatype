// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Run } from "./types.ts";

export class Context {
  private id: number = 0;
  constructor(private run: Run, private kwargs: Record<string, unknown>) {}

  #nextId() {
    this.id += 1;
    return this.id;
  }

  #appendOp(op: unknown) {
    this.run.operations.push(op);
  }

  async save<T>(fn: () => T) {
    // TODO: deduce from run otherwise actually execute fn

    const id = this.#nextId();
    const result = await Promise.resolve(fn());
    this.#appendOp({
      Save: {
        id,
        value: result,
      },
    });

    return result;
  }

  getRun() {
    return this.run;
  }

  start() {
    this.#appendOp({
      Start: {
        kwargs: this.kwargs,
      },
    });
  }

  stop(nativeRustResultType: "Ok" | "Err", result?: unknown) {
    this.#appendOp({
      Stop: {
        result: {
          [nativeRustResultType]: result,
        },
      },
    });
  }

  event(event_name: string, payload: unknown) {
    this.#appendOp({
      Send: {
        event_name,
        payload,
      },
    });
  }
}
