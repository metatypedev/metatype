// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Run } from "native";
export type { Operation, OperationEvent, Run } from "native";

export type AnyString = string & Record<string | number | symbol, never>;

export type WorkerEvent = "START" | "STOP" | AnyString;

export type WorkerData = {
  type: WorkerEvent;
  data: any;
};

export type WorkerEventHandler = (message: Result<unknown>) => void;

export type Result<T> = {
  error: boolean;
  payload: T;
};

export function Ok<R>(payload: R): Result<R> {
  return { error: false, payload };
}

export function Err<E>(payload: E): Result<E> {
  return { error: true, payload };
}

export function Msg(type: WorkerEvent, data: unknown): WorkerData {
  return { type, data };
}

export type WorkflowResult = {
  kind: "SUCCESS" | "FAIL";
  result: unknown;
  exception?: Error;
  run: Run;
};

// TODO: convert python exceptions into these
// by using prefixes on the exception message for example

// Note: Avoid refactoring with inheritance (e.g. `SleepInterrupt extends Interrupt`)
// inheritance information is erased when sending exceptions accross workers

export type InterruptType =
  | "SLEEP"
  | "WAIT_RECEIVE_EVENT"
  | "WAIT_HANDLE_EVENT"
  | "WAIT_ENSURE_VALUE";

export class Interrupt extends Error {
  private static readonly PREFIX = "SUBSTANTIAL_INTERRUPT_";

  private constructor(type: string) {
    super(Interrupt.PREFIX + type);
  }

  static getTypeOf(err: unknown): InterruptType | null {
    if (err instanceof Error && err.message.startsWith(this.PREFIX)) {
      return err.message.substring(this.PREFIX.length) as InterruptType;
    }
    return null;
  }

  static Variant(kind: InterruptType) {
    return new Interrupt(kind);
  }
}
