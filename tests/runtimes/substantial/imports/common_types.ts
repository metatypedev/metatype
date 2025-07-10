// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// TODO: include this as part of the metagen generated code

// TODO: merge these
export type Workflow<O> = (ctx: Context, ctx2: TaskCtx) => Promise<O>;

type SerializablePrimitive =
  | string
  | number
  | boolean
  | null
  | void // coerce to null
  | undefined; // coerce to null

type JSONValue = SerializablePrimitive | JSONObject | Array<JSONValue>;

interface JSONObject {
  [key: string]: JSONValue;
  // | ((...args: JSONValue[]) => JSONValue | Promise<JSONValue>); // skipped
}

type Serializable<T> = T extends JSONValue ? T : never;

export interface SerializableWorkflowHandle extends JSONObject {
  runId?: string;
  name: string;
  kwargs: JSONObject;
}

export interface ChildWorkflowHandle {
  name: string;
  result<O>(): Promise<O>;
  stop: () => Promise<void>;
  start: () => Promise<void>;
  hasStopped: () => Promise<boolean>;
}

export interface Context {
  kwargs: JSONObject;
  gql: (
    query: readonly string[],
    ...args: unknown[]
  ) => {
    run: (
      variables: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>;
  };
  sleep: (ms: number) => void;
  save<T>(
    fn: () => Serializable<T> | Promise<Serializable<T>>,
    option?: SaveOption,
  ): Promise<Serializable<T>>;
  receive<O>(eventName: string): O;
  handle<I, O>(
    eventName: string,
    fn: (received: I) => Serializable<O> | Promise<Serializable<O>>,
  ): Promise<Serializable<O>>;
  ensure(conditionFn: () => boolean | Promise<boolean>): Promise<true>;

  startChildWorkflow<O>(
    workflow: Workflow<O>,
    kwargs: unknown,
  ): Promise<SerializableWorkflowHandle>;
  createWorkflowHandle(
    handleDef: SerializableWorkflowHandle,
  ): ChildWorkflowHandle;

  logger: SubLogger;
}

interface SubLogger {
  warn: (...args: JSONValue[]) => void;
  info: (...args: JSONValue[]) => void;
  error: (...args: JSONValue[]) => void;
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
