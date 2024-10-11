// TODO: include this as part of the metagen generated code

// TODO:
export type Workflow<O> = (ctx: Context) => Promise<O>;

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
      variables: Record<string, unknown>
    ) => Promise<Record<string, unknown>>;
  };
  sleep: (ms: number) => void;
  save<T>(fn: () => T | Promise<T>, option?: SaveOption): Promise<T>;
  receive<O>(eventName: string): O;
  handle<I, O>(
    eventName: string,
    fn: (received: I) => O | Promise<O>
  ): Promise<O>;
  ensure(conditionFn: () => boolean | Promise<boolean>): Promise<true>;

  startChildWorkflow<O>(
    workflow: Workflow<O>,
    kwargs: unknown
  ): Promise<SerializableWorkflowHandle>;
  createWorkflowHandle(
    handleDef: SerializableWorkflowHandle
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
