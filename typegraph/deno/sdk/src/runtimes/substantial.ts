// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Materializer, Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Func, Typedef } from "../types.ts";
import {
  RedisBackend,
  SubstantialBackend,
  SubstantialOperationData,
  SubstantialOperationType,
  Workflow,
} from "../gen/typegraph_core.d.ts";

export class Backend {
  static memory(): SubstantialBackend {
    return { tag: "memory" };
  }

  static fs(): SubstantialBackend {
    return { tag: "fs" };
  }

  static redis(config: RedisBackend): SubstantialBackend {
    return { tag: "redis", val: config };
  }
}

export class SubstantialRuntime extends Runtime {
  backend: SubstantialBackend;
  workflow?: Workflow;

  constructor(backend: SubstantialBackend) {
    const id = runtimes.registerSubstantialRuntime({
      backend,
    });
    super(id);
    this.backend = backend;
  }

  _usingWorkflow(workflow: Workflow): SubstantialRuntime {
    this.workflow = workflow;
    return this;
  }

  #genericSubstantialFunc(
    operation: SubstantialOperationType,
    funcArg?: Typedef,
  ): Func<Typedef, Typedef, Materializer> {
    const data = {
      funcArg: funcArg?._id,
      operation,
    } as SubstantialOperationData;
    const funcData = runtimes.generateSubstantialOperation(this._id, data);
    return Func.fromTypeFunc(funcData);
  }

  start(): Func<Typedef, Typedef, Materializer> {
    return this.#genericSubstantialFunc({
      tag: "start",
      val: this.workflow!,
    });
  }

  stop(): Func<Typedef, Typedef, Materializer> {
    return this.#genericSubstantialFunc({
      tag: "stop",
      val: this.workflow!,
    });
  }

  send(payload: Typedef): Func<Typedef, Typedef, Materializer> {
    return this.#genericSubstantialFunc(
      {
        tag: "send",
        val: this.workflow!,
      },
      payload,
    );
  }

  ressources(): Func<Typedef, Typedef, Materializer> {
    return this.#genericSubstantialFunc({
      tag: "ressources",
      val: this.workflow!,
    });
  }
}
