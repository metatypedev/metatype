export interface ModuleTask {
  type: "module";
  name: string;
  id: number;
  path: string;
  data: ArrayBuffer;
}

export interface ModuleTaskData {
  args: Record<string, unknown>;
  context: Record<string, string>;
}

export interface FuncTask {
  type: "func";
  name: string;
  id: number;
  data: ArrayBuffer;
}

export interface FuncTaskData {
  args: Record<string, unknown>;
  context: Record<string, string>;
  code?: string;
}

export type Task = ModuleTask | FuncTask;

export interface TaskResult {
  id: number;
  data: ArrayBuffer;
}
