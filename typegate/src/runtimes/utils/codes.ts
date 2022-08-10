import intersectionBy from "https://deno.land/x/lodash@4.17.15-es/intersectionBy.js";

export interface Code {
  name: string;
  source: string;
  type: "module" | "func";
}

export interface TaskContext {
  parent?: Record<string, unknown>;
  context?: Record<string, string>;
}

export interface FuncStatus {
  code: Code;
  loaded: boolean;
  task?: TaskExec;
}

export function createFuncStatus(code: Code): FuncStatus {
  // ensured by the caller
  // ensure(code.type === 'func', 'code must be a function')
  return {
    code,
    loaded: false,
  };
}

export interface ModuleStatus {
  code: Code;
  loadedAt: string | undefined;
}

export function createModuleStatus(code: Code): ModuleStatus {
  // ensured by the caller
  // ensure(code.type === 'func', 'code must be a function')
  return {
    code,
    loadedAt: undefined,
  };
}

export interface Codes {
  funcs: Record<string, FuncStatus>;
  modules: Record<string, ModuleStatus>;
}

export class CodeList {
  private constructor(private codes: Code[]) {}

  static from(codes: Code[]) {
    return new CodeList(codes);
  }

  filterType(tpe: "module" | "func"): CodeList {
    return new CodeList(this.codes.filter((code) => code.type === tpe));
  }

  byNamesIn(names: string[]): Record<string, Code> {
    return Object.fromEntries(
      intersectionBy(
        this.codes.map((code) => [code.name, code]),
        names.map((name) => [name]),
        ([name]: [string, any?]) => name,
      ),
    );
  }
}

export interface FunctionMaterializerData {
  name: string;
  import_from: string | null;
}

interface TaskBase {
  type: "module" | "func";
  id: number;
  args: Record<string, unknown>;
  context: TaskContext;
}

export interface ModuleTask extends TaskBase {
  type: "module";
  name: string;
  path: string;
}

export interface FuncTask extends TaskBase {
  type: "func";
  name: string;
  code?: string;
}

export type Task = ModuleTask | FuncTask;

export interface TaskExec {
  (args: Record<string, unknown>, context: TaskContext): unknown;
}

export const predefinedFuncs: Record<string, TaskExec> = {
  identity: (args) => args,
};
