// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Meta, type Strategy } from "../../../engine/runtime.js";
import type { HostcallPump } from "../../worker_utils.ts";
import {
  Interrupt,
  type LogLevel,
  type OperationEvent,
  type Run,
  runHasStopped,
} from "./common.ts";

// const isTest = Deno.env.get("DENO_TESTING") === "true";
// const testBaseUrl = Deno.env.get("TEST_OVERRIDE_GQL_ORIGIN");

export class Context {
  private id = 0;
  private logId = 0;
  private oldRun: Run;
  public kwargs = {};
  logger: SubLogger;

  constructor(
    private run: Run,
    public gql: ReturnType<HostcallPump["newHandler"]>["gql"],
  ) {
    this.kwargs = getKwargsCopy(run);
    this.logger = new SubLogger(this);
    this.oldRun = deepClone(run);
  }

  #nextId() {
    this.id += 1;
    return this.id;
  }

  #nextLogId() {
    this.logId += 1;
    return this.logId;
  }

  #appendOp(op: OperationEvent) {
    if (!runHasStopped(this.run)) {
      this.run.operations.push({ at: new Date().toJSON(), event: op });
    }

    Meta.substantial.runEnsureDeterminism({
      old: this.oldRun,
      new: this.run,
    });
  }

  appendLogMessage(level: LogLevel, serializableArgs: Array<unknown>) {
    const id = this.#nextLogId();
    for (const { event } of this.run.operations) {
      if (event.type == "Log" && id == event.id) {
        return;
      }
    }

    this.#appendOp({
      type: "Log",
      id,
      level,
      payload: serializableArgs,
    });
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

      const clonedResult = deepClone(result ?? null);
      this.#appendOp({
        type: "Save",
        id,
        value: {
          type: "Resolved",
          payload: clonedResult,
        },
      });

      return clonedResult;
    } catch (err: any) {
      if (
        option?.retry?.maxRetries &&
        currRetryCount < option.retry.maxRetries
      ) {
        const { retry } = option;
        const delayMs = Meta.substantial.strategyRetry({
          config: {
            max_retries: retry.maxRetries,
            min_backoff_ms: retry.minBackoffMs,
            max_backoff_ms: retry.maxBackoffMs,
          },
          strategy: { type: retry.strategy ?? "linear" },
          retries: Math.max(retry.maxRetries - currRetryCount, 0),
        });

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

type Workflow<O> = (ctx: Context) => Promise<O>;

interface SerializableWorkflowHandle {
  runId?: string;

  name: string;
  kwargs: unknown;
}

class ChildWorkflowHandle {
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

class SubLogger {
  constructor(private ctx: Context) {}

  #log(kind: LogLevel, ...args: unknown[]) {
    const prefix = `[${kind.type.toUpperCase()}: ${this.ctx.getRun().run_id}]`;
    switch (kind.type) {
      case "Warn": {
        console.warn(prefix, ...args);
        break;
      }
      case "Error": {
        console.error(prefix, ...args);
        break;
      }
      default: {
        console.info(prefix, ...args);
        break;
      }
    }

    const safeArgs = args.map((arg) => {
      try {
        const json = JSON.stringify(arg);
        return json === undefined ? String(arg) : deepClone(arg);
      } catch (_) {
        return String(arg);
      }
    });

    this.ctx.appendLogMessage(kind, safeArgs);
  }

  warn(...payload: unknown[]) {
    this.#log({ type: "Warn" }, ...payload);
  }

  info(...payload: unknown[]) {
    this.#log({ type: "Info" }, ...payload);
  }

  error(...payload: unknown[]) {
    this.#log({ type: "Error" }, ...payload);
  }
}

interface SaveOption {
  timeoutMs?: number;
  retry?: {
    strategy?: Strategy["type"];
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

function getKwargsCopy(run: Run): Record<string, unknown> {
  const first = run.operations.at(0);
  if (!first) {
    throw new Error(
      `Bad run "${run.run_id}": cannot retrieve kwargs on a run that has not yet started`,
    );
  }

  if (first.event.type != "Start") {
    throw new Error(
      `Corrupted run "${run.run_id}": first operation is not a Start, got ${first.event.type} instead`,
    );
  }

  return deepClone(first.event.kwargs.kwargs) as Record<string, unknown>;
}

function deepClone<T>(clonableObject: T): T {
  return JSON.parse(JSON.stringify(clonableObject));
}
