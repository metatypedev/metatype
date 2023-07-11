// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Context } from "../../types.ts";
import { EffectType } from "../../types/typegraph.ts";

export interface Code {
  name: string;
  source: string;
  type: "module" | "func";
}

export interface TaskContext {
  parent?: Record<string, unknown>;
  context?: Context;
  secrets: Record<string, string>;
  effect: EffectType | null;
  meta: {
    url: string;
    token: string;
  };
  headers: Record<string, string>;
}

export interface FunctionMaterializerData {
  script: string;
}

export interface ImportFuncMaterializerData {
  mod: number;
  name: string;
}

interface TaskApply {
  args: Record<string, unknown>;
  internals: TaskContext;
  verbose: boolean;
}

export interface ImportFuncTask extends TaskApply {
  type: "import_func";
  name: string;
}

export interface FuncTask extends TaskApply {
  type: "func";
}

export interface RegisterImportFuncTask {
  type: "register_import_func";
  modulePath: string;
  op: number;
  verbose: boolean;
}

export interface RegisterFuncTask {
  type: "register_func";
  fnCode: string;
  op: number;
  verbose: boolean;
}

export type Task =
  | ImportFuncTask
  | FuncTask
  | RegisterImportFuncTask
  | RegisterFuncTask;

export interface TaskExec {
  (
    args: Record<string, unknown>,
    context: TaskContext,
    helpers: Record<string, unknown>,
  ): unknown;
}
