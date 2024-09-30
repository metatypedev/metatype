// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Materializer, Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Func, type Typedef } from "../types.ts";
import type {
  SubstantialBackend,
  SubstantialOperationData,
  SubstantialOperationType,
  Workflow,
} from "../gen/typegraph_core.d.ts";
import { t } from "../index.ts";

export class Backend {
  static devMemory(): SubstantialBackend {
    return { tag: "memory" };
  }

  static devFs(): SubstantialBackend {
    return { tag: "fs" };
  }

  static redis(connectionStringSecret: string): SubstantialBackend {
    return {
      tag: "redis",
      val: {
        connectionStringSecret,
      },
    };
  }
}

export class SubstantialRuntime extends Runtime {
  backend: SubstantialBackend;

  constructor(backend: SubstantialBackend) {
    const id = runtimes.registerSubstantialRuntime({
      backend,
    });
    super(id);
    this.backend = backend;
  }

  _genericSubstantialFunc(
    operation: SubstantialOperationType,
    funcArg?: Typedef,
    funcOut?: Typedef
  ): Func<Typedef, Typedef, Materializer> {
    const data = {
      funcArg: funcArg?._id,
      funcOut: funcOut?._id,
      operation,
    } as SubstantialOperationData;
    const funcData = runtimes.generateSubstantialOperation(this._id, data);
    return Func.fromTypeFunc(funcData);
  }

  deno(file: string, name: string, deps: Array<string> = []): WorkflowHandle {
    return new WorkflowHandle(this, { file, name, deps, kind: "deno" });
  }

  python(file: string, name: string, deps: Array<string> = []): WorkflowHandle {
    return new WorkflowHandle(this, { file, name, deps, kind: "python" });
  }
}

export class WorkflowHandle {
  constructor(private sub: SubstantialRuntime, private workflow: Workflow) {}

  start(kwargs: Typedef): Func<Typedef, Typedef, Materializer> {
    return this.sub._genericSubstantialFunc(
      {
        tag: "start",
        val: this.workflow!,
      },
      kwargs
    );
  }

  stop(): Func<Typedef, Typedef, Materializer> {
    return this.sub._genericSubstantialFunc({
      tag: "stop",
      val: this.workflow!,
    });
  }

  send(
    payload: Typedef,
    eventName?: string
  ): Func<Typedef, Typedef, Materializer> {
    const event = t.struct({
      name: eventName ? t.string().set(eventName) : t.string(),
      payload,
    });

    return this.sub._genericSubstantialFunc(
      {
        tag: "send",
        val: this.workflow!,
      },
      event
    );
  }

  queryResources(): Func<Typedef, Typedef, Materializer> {
    return this.sub._genericSubstantialFunc({
      tag: "resources",
      val: this.workflow!,
    });
  }

  queryResults(output: Typedef): Func<Typedef, Typedef, Materializer> {
    return this.sub._genericSubstantialFunc(
      {
        tag: "results",
        val: this.workflow!,
      },
      undefined,
      output
    );
  }
}
