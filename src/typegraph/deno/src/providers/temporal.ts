// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "../runtimes/mod.ts";
import { runtimes } from "../sdk.ts";
import { Func, Typedef } from "../types.ts";
import {
  TemporalOperationData,
  TemporalOperationType,
} from "../gen/runtimes.ts";

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
    funcOut?: Typedef,
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

  /** create a function to start a workflow */
  startWorkflow(workflowType: string, arg: Typedef): Func {
    return this.#genericTemporalFunc("start_workflow", workflowType, arg);
  }

  /** create a function to signal a workflow */
  signalWorkflow(signalName: string, arg: Typedef): Func {
    return this.#genericTemporalFunc("signal_workflow", signalName, arg);
  }

  /** create a function to query a workflow */
  queryWorkflow(queryType: string, arg: Typedef, out: Typedef): Func {
    return this.#genericTemporalFunc("query_workflow", queryType, arg, out);
  }

  /** create a function that describes a workflow */
  describeWorkflow(): Func {
    return this.#genericTemporalFunc("describe_workflow");
  }
}
