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

  rawStart(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "start-raw",
    });
  }

  stop(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "stop",
    });
  }

  send(payload: Typedef): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc(
      {
        tag: "send",
      },
      payload
    );
  }

  rawSend(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "send-raw",
    });
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

  rawQueryResults(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "results-raw",
    });
  }

  #internalLinkParentChild(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "internal-link-parent-child",
    });
  }

  internals(): Record<string, Func<Typedef, Typedef, Materializer>> {
    return {
      _sub_internal_start: this.rawStart(),
      _sub_internal_stop: this.stop(),
      _sub_internal_send: this.rawSend(),
      _sub_internal_results: this.rawQueryResults(),
      _sub_internal_link_parent_child: this.#internalLinkParentChild(),
    };
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
