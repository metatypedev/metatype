// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import type { Context } from "../../types.ts";
import type { EffectType } from "../../typegraph/types.ts";

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
