// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

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
}

export interface FunctionMaterializerData {
  script: string;
}

export interface ImportFuncMaterializerData {
  mod: number;
  name: string;
}

interface TaskBase {
  type: "func" | "import_func" | "predefined_func";
  id: number;
  args: Record<string, unknown>;
  internals: TaskContext;
  verbose: boolean;
}

export interface ImportFuncTask extends TaskBase {
  type: "import_func";
  moduleId: number;
  moduleCode?: string;
  name: string;
}

export interface FuncTask extends TaskBase {
  type: "func";
  fnId: number;
  code?: string;
}

export interface PredefinedFuncTask extends TaskBase {
  type: "predefined_func";
  name: string;
}

export type Task = ImportFuncTask | FuncTask | PredefinedFuncTask;

export interface TaskExec {
  (
    args: Record<string, unknown>,
    context: TaskContext,
    helpers: Record<string, unknown>,
  ): unknown;
}

export const predefinedFuncs: Record<string, TaskExec> = {
  identity: (args) => args,
};
