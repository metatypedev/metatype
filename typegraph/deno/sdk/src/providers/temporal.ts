// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../wit.ts";
import { Func, Typedef } from "../types.ts";
import {
  TemporalOperationData,
  TemporalOperationType,
} from "../gen/interfaces/metatype-typegraph-runtimes.d.ts";

export class TemporalRuntime extends Runtime {
  name: string;
  hostSecret: string;
  namespaceSecret?: string;

  constructor({
    name,
    hostSecret,
    namespaceSecret,
  }: {
    name: string;
    hostSecret: string;
    namespaceSecret?: string;
  }) {
    const id = runtimes.registerTemporalRuntime({
      name,
      hostSecret,
      namespaceSecret,
    });
    super(id);
    this.name = name;
    this.hostSecret = hostSecret;
    this.namespaceSecret = namespaceSecret;
  }

  #genericTemporalFunc(
    operation: TemporalOperationType,
    matArg?: string,
    funcArg?: Typedef,
    funcOut?: Typedef
  ) {
    const data = {
      matArg,
      funcArg: funcArg?._id,
      funcOut: funcOut?._id,
      operation,
    } as TemporalOperationData;
    const dataFunc = runtimes.generateTemporalOperation(this._id, data);
    return Func.fromTypeFunc(dataFunc);
  }

  startWorkflow(workflowType: string, arg: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "start-workflow",
      },
      workflowType,
      arg
    );
  }

  signalWorkflow(signalName: string, arg: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "signal-workflow",
      },
      signalName,
      arg
    );
  }

  queryWorkflow(queryType: string, arg: Typedef, out: Typedef) {
    return this.#genericTemporalFunc(
      {
        tag: "query-workflow",
      },
      queryType,
      arg,
      out
    );
  }

  describeWorkflow() {
    return this.#genericTemporalFunc({ tag: "describe-workflow" });
  }
}
