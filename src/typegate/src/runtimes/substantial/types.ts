// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Run } from "../../../engine/runtime.js";
export type {
  Operation,
  OperationEvent,
  Run,
  Backend,
} from "../../../engine/runtime.js";

export type AnyString = string & Record<string | number | symbol, never>;

export type WorkerEvent = "START" | AnyString;

export type WorkerData = {
  type: WorkerEvent;
  data: any;
};

export type WorkerEventHandler = (message: Result<unknown>) => Promise<void>;

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

export type ExecutionResultKind = "SUCCESS" | "FAIL";

export type WorkflowResult = {
  kind: ExecutionResultKind;
  result: unknown;
  exception?: Error;
  schedule: string;
  run: Run;
};

// TODO: convert python exceptions into these
// by using prefixes on the exception message for example

// Note: Avoid refactoring with inheritance (e.g. `SleepInterrupt extends Interrupt`)
// inheritance information is erased when sending exceptions accross workers

export type InterruptType =
  | "SLEEP"
  | "SAVE_RETRY"
  | "WAIT_RECEIVE_EVENT"
  | "WAIT_HANDLE_EVENT"
  | "WAIT_ENSURE_VALUE";

export class Interrupt extends Error {
  private static readonly PREFIX = "SUBSTANTIAL_INTERRUPT_";

  private constructor(type: string, cause?: unknown) {
    super(Interrupt.PREFIX + type);
    this.cause = cause;
  }

  static getTypeOf(err: unknown): InterruptType | null {
    if (err instanceof Error && err.message.startsWith(this.PREFIX)) {
      return err.message.substring(this.PREFIX.length) as InterruptType;
    }
    return null;
  }

  static Variant(kind: InterruptType, cause?: unknown) {
    return new Interrupt(kind, cause);
  }
}
