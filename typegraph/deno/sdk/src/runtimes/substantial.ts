// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Func, Struct, Typedef } from "../types.ts";
import {
  SubstantialOperationData,
  SubstantialOperationType,
  Workflow,
} from "../gen/typegraph_core.d.ts";

export type CoreDynFunction = Func<
  Struct<{
    [key: string]: Typedef;
  }>,
  Typedef,
  {
    _id: number;
  }
>;

export class SubstantialRuntime extends Runtime {
  endpoint: string;
  basicAuthSecret: string;
  workflow?: Workflow;

  constructor({
    endpoint,
    basicAuthSecret,
  }: {
    endpoint: string;
    basicAuthSecret: string;
  }) {
    const id = runtimes.registerSubstantialRuntime({
      endpoint,
      basicAuthSecret: basicAuthSecret,
    });
    super(id);
    this.endpoint = endpoint;
    this.basicAuthSecret = basicAuthSecret;
  }

  _usingWorkflow(
    file: string,
    name: string,
    deps: Array<string> = [],
  ): SubstantialRuntime {
    this.workflow = {
      name,
      file,
      deps,
    } as Workflow;
    return this;
  }

  #genericSubstantialFunc(
    operation: SubstantialOperationType,
    funcArg?: Typedef,
  ): CoreDynFunction {
    const data = {
      funcArg: funcArg?._id,
      operation,
    } as SubstantialOperationData;
    const funcData = runtimes.generateSubstantialOperation(this._id, data);
    return Func.fromTypeFunc(funcData);
  }

  start(): CoreDynFunction {
    return this.#genericSubstantialFunc({
      tag: "start",
      val: this.workflow!,
    });
  }

  stop(): CoreDynFunction {
    return this.#genericSubstantialFunc({
      tag: "stop",
      val: this.workflow!,
    });
  }

  send(payload: Typedef): CoreDynFunction {
    return this.#genericSubstantialFunc(
      {
        tag: "stop",
        val: this.workflow!,
      },
      payload,
    );
  }
}
