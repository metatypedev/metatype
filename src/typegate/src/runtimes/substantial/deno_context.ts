// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

// FIXME: DO NOT IMPORT any file that refers to Meta, this will be instantiated in a Worker
// import { sleep } from "../../utils.ts"; // will silently fail??

import { make_internal } from "../../worker_utils.ts";
import { TaskContext } from "../deno/shared_types.ts";
import { appendIfOngoing, Interrupt, OperationEvent, Run } from "./types.ts";

// const isTest = Deno.env.get("DENO_TESTING") === "true";
const testBaseUrl = Deno.env.get("TEST_OVERRIDE_GQL_ORIGIN");

const additionalHeaders = { connection: "keep-alive" };

export class Context {
  private id = 0;
  gql: ReturnType<typeof createGQLClient>;

  constructor(
    private run: Run,
    private kwargs: Record<string, unknown>,
    private internal: TaskContext,
  ) {
    this.gql = createGQLClient(internal);
  }

  #nextId() {
    // IDEA: this scheme does not account the step provided
    // Different args => potentially different step (notably for Save)
    this.id += 1;
    return this.id;
  }

  #appendOp(op: OperationEvent) {
    appendIfOngoing(this.run, { at: new Date().toJSON(), event: op });
  }

  async save<T>(fn: () => T | Promise<T>, option?: SaveOption) {
    const id = this.#nextId();

    let currRetryCount = 1;
    for (const { event } of this.run.operations) {
      if (event.type == "Save" && id == event.id) {
        if (event.value.type == "Resolved") {
          return event.value.payload;
        } else if (event.value.type == "Retry") {
          const delay = new Date(event.value.wait_until);
          if (delay.getTime() > new Date().getTime()) {
            // Too soon!
            throw Interrupt.Variant("SAVE_RETRY");
          } else {
            currRetryCount = event.value.counter;
          }
        }
      }
    }

    // current call already counts
    currRetryCount += 1;

    try {
      let result: any;
      if (option?.timeoutMs && option.timeoutMs > 0) {
        result = await Promise.race([fn(), failAfter(option.timeoutMs)]);
      } else {
        result = await Promise.resolve(fn());
      }

      this.#appendOp({
        type: "Save",
        id,
        value: {
          type: "Resolved",
          payload: result ?? null,
        },
      });

      return result;
    } catch (err) {
      if (
        option?.retry?.maxRetries &&
        currRetryCount < option.retry.maxRetries
      ) {
        const { retry } = option;
        const strategy = new RetryStrategy(
          retry.maxRetries,
          retry.minBackoffMs,
          retry.maxBackoffMs,
        );

        const retriesLeft = Math.max(retry.maxRetries - currRetryCount, 0);
        const delayMs = strategy.eval(retry.strategy ?? "linear", retriesLeft);
        const waitUntilAsMs = new Date().getTime() + delayMs;

        this.#appendOp({
          type: "Save",
          id,
          value: {
            type: "Retry",
            wait_until: new Date(waitUntilAsMs).toJSON(),
            counter: currRetryCount,
          },
        });

        throw Interrupt.Variant("SAVE_RETRY");
      } else {
        this.#appendOp({
          type: "Save",
          id,
          value: {
            type: "Failed",
            err: {
              retries: currRetryCount,
              message: err?.message ?? `${err}`,
            },
          },
        });
      }

      throw err;
    }
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

  appendEvent(event_name: string, payload: unknown) {
    this.#appendOp({
      type: "Send",
      event_name,
      value: payload,
    });
  }

  receive(eventName: string) {
    for (const { event } of this.run.operations) {
      if (event.type == "Send" && event.event_name == eventName) {
        return event.value;
      }
    }

    throw Interrupt.Variant("WAIT_RECEIVE_EVENT");
  }

  async handle(
    eventName: string,
    fn: (received: unknown) => unknown | Promise<unknown>,
  ) {
    for (const { event } of this.run.operations) {
      if (event.type == "Send" && event.event_name == eventName) {
        const payload = event.value;
        return await this.save(async () => await fn(payload));
      }
    }

    throw Interrupt.Variant("WAIT_HANDLE_EVENT");
  }

  async ensure(conditionFn: () => boolean | Promise<boolean>) {
    const result = await conditionFn();
    if (!result) {
      throw Interrupt.Variant("WAIT_ENSURE_VALUE");
    }

    return result;
  }

  // Note: This is designed to be used inside ctx.save(..)
  async startChildWorkflow<O>(workflow: Workflow<O>, kwargs: unknown) {
    const handle = new ChildWorkflowHandle(this, {
      name: workflow.name,
      kwargs,
    });
    const runId = await handle.start();
    return {
      ...handle.handleDef,
      runId,
    };
  }

  // Note: This is designed to be used outside a ctx.save since function methods cannot be persisted
  createWorkflowHandle(handleDef: SerializableWorkflowHandle) {
    if (!handleDef.runId) {
      throw new Error(
        "Cannot create handle from a definition that was not run",
      );
    }
    return new ChildWorkflowHandle(this, handleDef);
  }
}

export type Workflow<O> = (ctx: Context) => Promise<O>;

interface SerializableWorkflowHandle {
  runId?: string;

  name: string;
  kwargs: unknown;
}

export class ChildWorkflowHandle {
  constructor(
    private ctx: Context,
    public handleDef: SerializableWorkflowHandle,
  ) {}

  async start(): Promise<string> {
    const { data } = await this.ctx.gql /**/`
      mutation ($name: String!, $kwargs: String!) {
        _sub_internal_start(name: $name, kwargs: $kwargs)
      }
    `.run({
      name: this.handleDef.name,
      kwargs: JSON.stringify(this.handleDef.kwargs),
    });

    this.handleDef.runId = (data as any)._sub_internal_start as string;
    this.#checkRunId();

    const { data: _ } = await this.ctx.gql /**/`
      mutation ($parent_run_id: String!, $child_run_id: String!) {
        _sub_internal_link_parent_child(parent_run_id: $parent_run_id, child_run_id: $child_run_id)
      }
    `.run({
      parent_run_id: this.ctx.getRun().run_id,
      child_run_id: this.handleDef.runId!,
    });

    return this.handleDef.runId!;
  }

  async result<O>(): Promise<O> {
    this.#checkRunId();

    const { data } = await this.ctx.gql /**/`
      query ($name: String!) {
        _sub_internal_results(name: $name) {
          completed {
            runs {
              run_id
              result {
                value
                status
              }
            }
          }
        }
      }
    `.run({
      name: this.handleDef.name,
    });

    const runs = (data as any)?._sub_internal_results?.completed
      ?.runs as Array<any>;

    const current = runs
      .filter(({ run_id }) => run_id == this.handleDef.runId)
      .shift();
    if (current) {
      return JSON.parse(current.result.value) as O;
    }

    throw Error(`Result for child workflow "${name}" not yet resolved`);
  }

  async stop(): Promise<string> {
    this.#checkRunId();

    const { data } = await this.ctx.gql /**/`
      mutation ($run_id: String!) {
        _sub_internal_stop(run_id: $run_id)
      }
    `.run({
      run_id: this.handleDef.runId,
    });

    return (data as any)._sub_internal_stop as string;
  }

  async hasStopped(): Promise<boolean> {
    this.#checkRunId();

    const { data } = await this.ctx.gql /**/`
      query {
        _sub_internal_results(name: $name) {
          completed {
            runs {
              run_id
            }
          }
        }
      }
    `.run({
      name: this.handleDef.name,
    });

    const runs = (data as any)?._sub_internal_results?.completed
      ?.runs as Array<any>;

    return runs.some(({ run_id }) => run_id == this.handleDef.runId);
  }

  #checkRunId() {
    if (!this.handleDef.runId) {
      throw new Error(
        "Invalid state: run_id is not properly set, this could mean that the workflow was not started yet",
      );
    }
  }
}

// TODO: move all of these into substantial lib once Meta can be used inside workers
// ```rust
// #[serde(....)]
// pub enum RetryStrategy { Linear {...}, Exp { ... }}
// impl RetryStrategy { pub fn eval(&self, retries_left: i8) { .. }}
//
// ```

type Strategy = "linear";

interface SaveOption {
  timeoutMs?: number;
  retry?: {
    strategy?: Strategy; // TODO: add more
    minBackoffMs: number;
    maxBackoffMs: number;
    maxRetries: number;
  };
}

function failAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(Error("Save timed out"));
    }, ms);
  });
}

class RetryStrategy {
  minBackoffMs?: number;
  maxBackoffMs?: number;
  maxRetries: number;

  constructor(
    maxRetries: number,
    minBackoffMs?: number,
    maxBackoffMs?: number,
  ) {
    this.maxRetries = maxRetries;
    this.minBackoffMs = minBackoffMs;
    this.maxBackoffMs = maxBackoffMs;

    if (this.maxRetries < 1) {
      throw new Error("maxRetries < 1");
    }

    const low = this.minBackoffMs;
    const high = this.maxBackoffMs;

    if (low && high) {
      if (low >= high) {
        throw new Error("minBackoffMs >= maxBackoffMs");
      }
      if (low < 0) {
        throw new Error("minBackoffMs < 0");
      }
    } else if (low && high == undefined) {
      this.maxBackoffMs = low + 10;
    } else if (low == undefined && high) {
      this.minBackoffMs = Math.max(0, high - 10);
    }
  }

  eval(strategy: Strategy, retriesLeft: number) {
    switch (strategy) {
      case "linear":
        return this.#linear(retriesLeft);
      // TODO: add more
      default:
        throw new Error(`Unknown strategy "${strategy}" provided`);
    }
  }

  #linear(retriesLeft: number): number {
    if (retriesLeft <= 0) {
      throw new Error("retries left <= 0");
    }

    const dt = (this.maxBackoffMs ?? 0) - (this.minBackoffMs ?? 0);
    return Math.floor(((this.maxRetries - retriesLeft) * dt) / this.maxRetries);
  }
}

function createGQLClient(internal: TaskContext) {
  const tgLocal = new URL(internal.meta.url);
  if (testBaseUrl) {
    const newBase = new URL(testBaseUrl);
    tgLocal.protocol = newBase.protocol;
    tgLocal.hostname = newBase.hostname;
    tgLocal.port = newBase.port;
  }

  const meta = { ...internal.meta, url: tgLocal.toString() };
  return make_internal({ ...internal, meta }, additionalHeaders).gql;
}
