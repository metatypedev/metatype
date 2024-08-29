// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export class Context<R extends { operations: Array<unknown> }> {
  private id: number = 0;
  constructor(private run: R) {}

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
        kwargs: {},
      },
    });
  }

  stop(result?: unknown) {
    this.#appendOp({
      Stop: {
        result,
      },
    });
  }
}
