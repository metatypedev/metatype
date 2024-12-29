// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO: include this as part of the metagen generated code

// TODO: merge these
export type Workflow<O> = (ctx: Context, ctx2: TaskCtx) => Promise<O>;

export interface SerializableWorkflowHandle {
  runId?: string;
  name: string;
  kwargs: unknown;
}

export interface ChildWorkflowHandle {
  name: string;
  result<O>(): Promise<O>;
  stop: () => Promise<void>;
  start: () => Promise<void>;
  hasStopped: () => Promise<boolean>;
}

export interface Context {
  kwargs: any;
  gql: (
    query: readonly string[],
    ...args: unknown[]
  ) => {
    run: (
      variables: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
  sleep: (ms: number) => void;
  save<T>(fn: () => T | Promise<T>, option?: SaveOption): Promise<T>;
  receive<O>(eventName: string): O;
  handle<I, O>(
    eventName: string,
    fn: (received: I) => O | Promise<O>,
  ): Promise<O>;
  ensure(conditionFn: () => boolean | Promise<boolean>): Promise<true>;

  startChildWorkflow<O>(
    workflow: Workflow<O>,
    kwargs: unknown,
  ): Promise<SerializableWorkflowHandle>;
  createWorkflowHandle(
    handleDef: SerializableWorkflowHandle,
  ): ChildWorkflowHandle;

  logger: SubLogger
  utils: Utils;
}

interface SubLogger {
  warn: (...args: unknown[]) => Promise<void>;
  info: (...args: unknown[]) => Promise<void>;
  error: (...args: unknown[]) => Promise<void>;
}

export type TaskCtx = {
  parent?: Record<string, unknown>;
  /**
   * Request context extracted by auth extractors.
   */
  context?: Record<string, unknown>;
  secrets: Record<string, string>;
  effect: "create" | "update" | "delete" | "read" | undefined | null;
  meta: {
    url: string;
    token: string;
  };
  headers: Record<string, string>;
};

export interface SaveOption {
  timeoutMs?: number;
  retry?: {
    strategy?: "linear";
    minBackoffMs: number;
    maxBackoffMs: number;
    maxRetries: number;
  };
  compensateWith?: () => any | Promise<any>
}

export interface Utils {
  now: () => Promise<Date>;
  random: (a: number, b: number) => Promise<number>;
  uuid4: () => Promise<string>;
}

export async function queryThatTakesAWhile<T>(input: T): Promise<T> {
  await sleep(2000);
  return input;
}

export function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

export async function sendSubscriptionEmail(to: string) {
  return await queryThatTakesAWhile(`Email sent to ${to}`);
}
