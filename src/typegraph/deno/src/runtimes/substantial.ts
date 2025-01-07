// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Materializer, Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../sdk.ts";
import { Func, type Typedef } from "../types.ts";
import type {
  SubstantialBackend,
  SubstantialOperationData,
  WorkflowFileDescription,
  WorkflowKind,
} from "../gen/runtimes.ts";

interface StartFunc {
  secrets?: string[];
}

export class SubstantialRuntime extends Runtime {
  backend: SubstantialBackend;

  constructor(
    backend: SubstantialBackend,
    fileDescriptions: Array<WorkflowFileDescription>,
  ) {
    const id = runtimes.registerSubstantialRuntime({
      backend,
      fileDescriptions,
    });
    super(id);
    this.backend = backend;
  }

  _genericSubstantialFunc(
    data: SubstantialOperationData,
  ): Func<Typedef, Typedef, Materializer> {
    const funcData = runtimes.generateSubstantialOperation(this._id, data);
    return Func.fromTypeFunc(funcData);
  }

  start(
    kwargs: Typedef,
    { secrets }: StartFunc = {},
  ): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      start: { secrets: secrets ?? [], funcArg: kwargs._id },
    });
  }

  startRaw({ secrets }: StartFunc = {}): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      startRaw: { secrets: secrets ?? [] },
    });
  }

  stop(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc("stop");
  }

  send(payload: Typedef): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      send: payload._id,
    });
  }

  sendRaw(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc("send_raw");
  }

  queryResources(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc("resources");
  }

  queryResults(output: Typedef): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      results: output._id,
    });
  }

  queryResultsRaw(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc("results_raw");
  }

  advancedFilters(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc({
      tag: "advanced-filters"
    });
  }

  #internalLinkParentChild(): Func<Typedef, Typedef, Materializer> {
    return this._genericSubstantialFunc("internal_link_parent_child");
  }

  internals(): Record<string, Func<Typedef, Typedef, Materializer>> {
    return {
      _sub_internal_start: this.startRaw(),
      _sub_internal_stop: this.stop(),
      _sub_internal_send: this.sendRaw(),
      _sub_internal_results: this.queryResultsRaw(),
      _sub_internal_link_parent_child: this.#internalLinkParentChild(),
    };
  }
}

export class Backend {
  static devMemory(): SubstantialBackend {
    return "memory";
  }

  static devFs(): SubstantialBackend {
    return "fs";
  }

  static redis(connectionStringSecret: string): SubstantialBackend {
    return {
      redis: {
        connectionStringSecret,
      },
    };
  }
}

export class WorkflowFile {
  private workflows: Array<string> = [];

  private constructor(
    public readonly file: string,
    public readonly kind: WorkflowKind,
    public deps: Array<string> = [],
  ) {}

  static deno(file: string, deps: Array<string> = []): WorkflowFile {
    return new WorkflowFile(file, "deno", deps);
  }

  static python(file: string, deps: Array<string> = []): WorkflowFile {
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
