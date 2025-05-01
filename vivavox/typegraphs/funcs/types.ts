// TODO: include this as part of the metagen generated code

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

export interface InternalContext {
  parent?: Record<string, unknown>;
  context?: Record<string, unknown>;
  secrets: Record<string, string>;
  effect: "create" | "update" | "delete" | "read" | undefined | null;
  meta: {
    url: string;
    token: string;
  };
  headers: Record<string, string>;
}

export interface Operation {
  at: string;
  event: {
    type: string;
    kwargs: any;
  };
}

export interface RunData {
  run_id: string;
  operations: Operation;
}

export interface Context {
  run: RunData;
  internal: InternalContext;
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
}

export interface SaveOption {
  timeoutMs?: number;
  retry?: {
    strategy?: "linear";
    minBackoffMs: number;
    maxBackoffMs: number;
    maxRetries: number;
  };
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
