// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

import { Deferred } from "std/async/deferred.ts";
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
  moduleId: number;
  name: string;
}

export interface FuncTask extends TaskApply {
  type: "func";
  fnId: number;
}

export interface RegisterImportFuncTask {
  type: "register_import_func";
  moduleId: number;
  moduleCode: string;
}

export interface RegisterFuncTask {
  type: "register_func";
  fnId: number;
  fnCode: string;
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

export interface SuccessMessage {
  id: number; // task id
  value: unknown;
}

export interface ErrorMessage {
  id: number; // task id
  error: string;
}

export type Message = SuccessMessage | ErrorMessage;

export interface TaskData {
  promise: Deferred<unknown>;
  hooks: Array<() => void | Promise<void>>;
}

export interface Envelop {
  id: number;
}

interface SuccessAnswer<T> {
  data: T;
  error: never;
}

interface ErrorAnswer {
  data: never;
  error: string;
}
export type Answer<T> = SuccessAnswer<T> | ErrorAnswer;
