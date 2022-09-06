export interface Code {
  name: string;
  source: string;
  type: "module" | "func";
}

export interface TaskContext {
  parent?: Record<string, unknown>;
  context?: Record<string, string>;
}

export interface FunctionMaterializerData {
  fn_expr: string;
}

export interface ImportFuncMaterializerData {
  mod: number;
  name: string;
}

interface TaskBase {
  type: "func" | "import_func";
  id: number;
  args: Record<string, unknown>;
  context: TaskContext;
}

export interface ImportFuncTask extends TaskBase {
  type: "import_func";
  module: string;
  name: string;
}

export interface FuncTask extends TaskBase {
  type: "func";
  fnId: number;
  code?: string;
}

export type Task = ImportFuncTask | FuncTask;

export interface TaskExec {
  (args: Record<string, unknown>, context: TaskContext): unknown;
}

export const predefinedFuncs: Record<string, TaskExec> = {
  identity: (args) => args,
};
