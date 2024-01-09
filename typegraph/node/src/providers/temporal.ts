// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.js";
import { runtimes } from "../wit.js";
import { Func, Typedef } from "../types.js";
import {
  TemporalOperationData,
  TemporalOperationType,
} from "../gen/interfaces/metatype-typegraph-runtimes.js";

export class TemporalRuntime extends Runtime {
  host: string;
  name: string;

  constructor(name: string, host: string) {
    const id = runtimes.registerTemporalRuntime({
      name,
      host,
    });
    super(id);
    this.name = name;
    this.host = host;
  }

  #genericTemporalFunc(
    operation: TemporalOperationType,
    matArg?: string,
    funcArg?: Typedef,
  ) {
    const data = {
      matArg,
      funcArg: funcArg?._id,
      operation,
    } as TemporalOperationData;
    const dataFunc = runtimes.generateTemporalOperation(
      this._id,
      data,
    );
    return Func.fromTypeFunc(dataFunc);
  }

  startWorkflow(workflowType: string, arg: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "start-workflow",
      },
      workflowType,
      arg,
    );
  }

  signalWorkflow(signalName: string, arg: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "signal-workflow",
      },
      signalName,
      arg,
    );
  }

  queryWorkflow(queryType: string, arg: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "query-workflow",
      },
      queryType,
      arg,
    );
  }

  describeWorkflow() {
    return this.#genericTemporalFunc({ tag: "describe-workflow" });
  }
}
