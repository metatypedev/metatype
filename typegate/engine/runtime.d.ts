// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

interface WasiInput {
  func: string;
  wasm: string;
  args: Array<string>;
  out: string;
}
interface PrismaRegisterEngineInp {
  datamodel: string;
  engine_name: string;
}
interface PrismaQueryInp {
  engine_name: string;
  // deno-lint-ignore no-explicit-any
  query: any;
  datamodel: string;
}
interface PrismaDiffInp {
  datasource: string;
  datamodel: string;
  script: boolean;
}
interface PrismaDevInp {
  datasource: string;
  datamodel: string;
  migrations: string | undefined | null;
  reset_database: boolean;
}
type PrismaApplyOut =
  | {
    ResetRequired: {
      reset_reason: string;
    };
  }
  | {
    Ok: {
      applied_migrations: Array<string>;
      reset_reason: string | undefined | null;
    };
  };
interface PrismaDeployOut {
  migration_count: number;
  applied_migrations: Array<string>;
}
interface PrismaCreateInp {
  datasource: string;
  datamodel: string;
  migrations: string | undefined | null;
  migration_name: string;
  apply: boolean;
}
interface PrismaCreateOut {
  created_migration_name: string | undefined | null;
  migrations: string | undefined | null;
  apply_err: string | undefined | null;
}
interface PrismaDeployInp {
  datasource: string;
  datamodel: string;
  migrations: string;
}
interface UnpackInp {
  dest: string;
  migrations: string;
}
interface TemporalRegisterInput {
  url: string;
  namespace: string;
  client_id: string;
}
interface TemporalWorkflowStartInput {
  client_id: string;
  workflow_id: string;
  workflow_type: string;
  task_queue: string;
  request_id: string | undefined | null;
  args: Array<string>;
}
interface TemporalWorkflowSignalInput {
  client_id: string;
  workflow_id: string;
  run_id: string;
  signal_name: string;
  request_id: string | undefined | null;
  args: string | undefined | null;
}
interface TemporalWorkflowQueryInput {
  client_id: string;
  workflow_id: string;
  run_id: string;
  query_type: string;
  args: string | undefined | null;
}
interface TemporalWorkflowDescribeInput {
  client_id: string;
  workflow_id: string;
  run_id: string;
}
interface TemporalWorkflowDescribeOutput {
  start_time: number | undefined | null;
  close_time: number | undefined | null;
  state: number | undefined | null;
}
interface TemporalWorkflowDescribeOutput {
  start_time: number | undefined | null;
  close_time: number | undefined | null;
  state: number | undefined | null;
}
interface PythonRegisterInp {
  vm: string;
  name: string;
  code: string;
}
interface PythonUnregisterInp {
  vm: string;
  name: string;
}
interface PythonApplyInp {
  vm: string;
  id: number;
  name: string;
  /**
   * stringified json array
   */
  args: string;
}
interface WasiVmInitConfig {
  vm_name: string;
  pylib_path: string;
  wasi_mod_path: string;
  preopens: Array<string>;
}
interface TableDiff {
  column: string;
  diff: {
    action: "Added" | "Removed" | "Altered";
    type_diff: "NullableToRequired" | "RequiredToNullable" | null | undefined;
  };
}
interface ParsedDiff {
  table: string;
  diff: TableDiff[];
}
declare namespace Meta {
  function version(): string;
  function typescriptFormatCode(source: string): string;
  function typegraphValidate(json: string): string;
  function validatePrismaRuntimeData(obj: any): void;
  function wasmedgeWasi(inp: WasiInput): string;

  namespace prisma {
    function registerEngine(
      inp: PrismaRegisterEngineInp,
    ): Promise<void>;
    function unregisterEngine(engine_name: string): Promise<void>;
    function query(inp: PrismaQueryInp): Promise<string>;
    function diff(
      inp: PrismaDiffInp,
    ): Promise<[string, ParsedDiff[]] | undefined | null>;
    function apply(inp: PrismaDevInp): Promise<PrismaApplyOut>;
    function deploy(inp: PrismaDeployInp): Promise<PrismaDeployOut>;
    function create(inp: PrismaCreateInp): Promise<PrismaCreateOut>;
    function reset(datasource: string): Promise<boolean>;
    function unpack(inp: UnpackInp): void;
    function archive(path: string): string | undefined | null;
  }

  namespace temporal {
    function clientRegister(inp: TemporalRegisterInput): Promise<void>;
    function clientUnregister(client_id: string): void;
    function workflowStart(
      inp: TemporalWorkflowStartInput,
    ): Promise<string>;
    function workflowSignal(
      inp: TemporalWorkflowSignalInput,
    ): Promise<void>;
    function workflowQuery(
      inp: TemporalWorkflowQueryInput,
    ): Promise<Array<string>>;
    function workflowDescribe(
      inp: TemporalWorkflowDescribeInput,
    ): Promise<TemporalWorkflowDescribeOutput>;
  }
  namespace python {
    function registerVm(inp: WasiVmInitConfig): void;
    function unregisterVm(vm_name: string): void;

    function registerLambda(inp: PythonRegisterInp): string;
    function unregisterLambda(inp: PythonUnregisterInp): string;
    function applyLambda(inp: PythonApplyInp): string;

    function registerDef(inp: PythonRegisterInp): string;
    function unregisterDef(inp: PythonUnregisterInp): string;
    function applyDef(inp: PythonApplyInp): string;

    function registerModule(inp: PythonRegisterInp): string;
    function unregisterModule(inp: PythonUnregisterInp): string;
  }
}
