// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Materializer, Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Func, type Typedef } from "../types.ts";
import type {
  SubstantialBackend,
  SubstantialOperationData,
  SubstantialOperationType,
  WorkflowFileDescription,
  WorkflowKind,
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

  constructor(
    backend: SubstantialBackend,
    fileDescriptions: Array<WorkflowFileDescription>
  ) {
    const id = runtimes.registerSubstantialRuntime({
      backend,
      fileDescriptions,
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

  start(kwargs: Typedef): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc(
      {
        tag: "start",
      },
      kwargs
    );
  }

  stop(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "stop",
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

    return this._genericSubstantialFunc(
      {
        tag: "send",
      },
      event
    );
  }

  queryResources(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "resources",
    });
  }

  queryResults(output: Typedef): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc(
      {
        tag: "results",
      },
      undefined,
      output
    );
  }
}

export class WorkflowFile {
  private workflows: Array<string> = [];

  private constructor(
    public readonly file: string,
    public readonly kind: WorkflowKind,
    public deps: Array<string> = []
  ) {}

  deno(file: string, deps: Array<string> = []): WorkflowFile {
    return new WorkflowFile(file, "deno", deps);
  }

  python(file: string, deps: Array<string> = []): WorkflowFile {
    return new WorkflowFile(file, "python", deps);
  }

  import(names: Array<string>): WorkflowFile {
    this.workflows.push(...names);
    return this;
  }

  build(): WorkflowFileDescription {
    return {
      deps: this.deps,
      file: this.file,
      kind: this.kind,
      workflows: this.workflows,
    };
  }
}
