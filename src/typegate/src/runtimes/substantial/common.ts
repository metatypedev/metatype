// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Operation, Run } from "../../../engine/runtime.js";
import type { TaskContext } from "../deno/shared_types.ts";
import type { DenoWorkerError } from "../patterns/worker_manager/deno.ts";
export type {
  Backend,
  Operation,
  OperationEvent,
  Run,
} from "../../../engine/runtime.js";

export type WorkflowMessage =
  | {
    type: "START";
    data: {
      modulePath: string;
      functionName: string;
      run: Run;
      schedule: string;
      internal: TaskContext;
    };
  }
  | { type: "HOSTCALL_RESP"; id: string; result: any; error: any };

export type WorkflowCompletionEvent =
  | {
    type: "SUCCESS";
    result: unknown;
    run: Run;
    schedule: string;
  }
  | {
    type: "FAIL";
    error: string;
    exception: Error | undefined;
    run: Run;
    schedule: string;
  };

export type InterruptEvent = {
  type: "INTERRUPT";
  interrupt: InterruptType;
  schedule: string;
  run: Run;
};

export type WorkflowEvent =
  | WorkflowCompletionEvent
  | InterruptEvent
  | {
    type: "ERROR";
    error: string;
  }
  | DenoWorkerError
  | { type: "HOSTCALL"; id: string; opName: string; json: string };

export type Result<T> = {
  error: boolean;
  payload: T;
};

export type ExecutionResultKind = "SUCCESS" | "FAIL";

export type ExecutionStatus =
  | "COMPLETED"
  | "COMPLETED_WITH_ERROR"
  | "ONGOING"
  | "UNKNOWN";

// TODO: convert python exceptions into these
// by using prefixes on the exception message for example

// Note: Avoid refactoring with inheritance (e.g. `SleepInterrupt extends Interrupt`)
// inheritance information is erased when sending exceptions accross workers

const validInterrupts = [
  "SLEEP",
  "SAVE_RETRY",
  "WAIT_RECEIVE_EVENT",
  "WAIT_HANDLE_EVENT",
  "WAIT_ENSURE_VALUE",
] as const;

type InterruptType = (typeof validInterrupts)[number];

export class Interrupt extends Error {
  private static readonly PREFIX = "SUBSTANTIAL_INTERRUPT_";

  private constructor(type: string, cause?: unknown) {
    super(Interrupt.PREFIX + type);
    this.cause = cause;
  }

  static getTypeOf(err: unknown): InterruptType | null {
    if (err instanceof Error && err.message.startsWith(this.PREFIX)) {
      const interrupt = err.message.substring(this.PREFIX.length);
      if (validInterrupts.includes(interrupt as any)) {
        return interrupt as InterruptType;
      }
      throw new Error(`Unknown interrupt "${interrupt}"`);
    }
    return null;
  }

  static Variant(kind: InterruptType, cause?: unknown) {
    return new Interrupt(kind, cause);
  }
}

export function runHasStopped(run: Run) {
  return run.operations.some(({ event }) => event.type == "Stop");
}

export function checkOperationHasBeenScheduled(run: Run, operation: Operation) {
  return run.operations.some(({ at, event }) =>
    at == operation.at && event == operation.event
  );
}
