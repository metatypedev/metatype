// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

export function get_version() {
  return Meta.version();
}

export function init_native() {
  // do nothing
}

export type FormatCodeInp = {
  source: string;
};
export type FormatCodeOut =
  | {
    Ok: {
      formatted_code: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export function typescript_format_code(input: FormatCodeInp) {
  try {
    const out = Meta.typescriptFormatCode(input.source);
    return {
      Ok: {
        formatted_code: out,
      },
    };
  } catch (err) {
    if (typeof err == "string") {
      return {
        Err: {
          message: err,
        },
      };
    }
    throw err;
  }
}

export type ValidateInput = {
  // deno-lint-ignore no-explicit-any
  obj: any;
};
export type ValidateResult = {
  error: string | undefined | null;
};

export function validate_prisma_runtime_data(
  a0: ValidateInput,
): ValidateResult {
  try {
    Meta.validatePrismaRuntimeData(a0.obj);
    return { error: undefined };
  } catch (err) {
    return { error: err.toString() };
  }
}
export type TypegraphValidateInp = {
  json: string;
};
export type TypegraphValidateOut =
  | {
    Valid: {
      json: string;
    };
  }
  | {
    NotValid: {
      reason: string;
    };
  };

export function typegraph_validate(
  a0: TypegraphValidateInp,
): TypegraphValidateOut {
  try {
    const res = Meta.typegraphValidate(a0.json);
    return { Valid: { json: res } };
  } catch (err) {
    return {
      NotValid: {
        reason: err.toString(),
      },
    };
  }
}
export type WasiInput = {
  func: string;
  wasm: string;
  args: Array<string>;
  out: string;
};
export type WasiOutput =
  | {
    Ok: {
      res: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export function wasmedge_wasi(a0: WasiInput): Promise<WasiOutput> {
  try {
    const out = Meta.wasmedgeWasi(a0);
    return Promise.resolve({ Ok: { res: out } });
  } catch (err) {
    return Promise.resolve({ Err: { message: err.toString() } });
  }
}

export type TemporalRegisterInput = {
  url: string;
  namespace: string;
  client_id: string;
};
export type TemporalRegisterOutput =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function temporal_register(
  a0: TemporalRegisterInput,
): Promise<TemporalRegisterOutput> {
  try {
    await Meta.temporal.clientRegister(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type TemporalUnregisterInput = {
  client_id: string;
};
export type TemporalUnregisterOutput =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export function temporal_unregister(
  a0: TemporalUnregisterInput,
): Promise<TemporalUnregisterOutput> {
  try {
    Meta.temporal.clientUnregister(a0.client_id);
    return Promise.resolve("Ok");
  } catch (err) {
    return Promise.resolve({ Err: { message: err.toString() } });
  }
}

export type TemporalWorkflowStartInput = {
  client_id: string;
  workflow_id: string;
  workflow_type: string;
  task_queue: string;
  request_id: string | undefined | null;
  args: Array<string>;
};
export type TemporalWorkflowStartOutput =
  | {
    Ok: {
      run_id: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };
export async function temporal_workflow_start(
  a0: TemporalWorkflowStartInput,
): Promise<TemporalWorkflowStartOutput> {
  try {
    const out = await Meta.temporal.workflowStart(a0);
    return { Ok: { run_id: out } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type TemporalWorkflowSignalInput = {
  client_id: string;
  workflow_id: string;
  run_id: string;
  signal_name: string;
  request_id: string | undefined | null;
  args: string | undefined | null;
};
export type TemporalWorkflowSignalOutput =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function temporal_workflow_signal(
  a0: TemporalWorkflowSignalInput,
): Promise<TemporalWorkflowSignalOutput> {
  try {
    await Meta.temporal.workflowSignal(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type TemporalWorkflowDescribeInput = {
  client_id: string;
  workflow_id: string;
  run_id: string;
};
export type TemporalWorkflowDescribeOutput =
  | {
    Ok: {
      start_time: number | undefined | null;
      close_time: number | undefined | null;
      state: number | undefined | null;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export async function temporal_workflow_describe(
  a0: TemporalWorkflowDescribeInput,
): Promise<TemporalWorkflowDescribeOutput> {
  try {
    const out = await Meta.temporal.workflowDescribe(a0);
    return { Ok: out };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type TemporalWorkflowQueryInput = {
  client_id: string;
  workflow_id: string;
  run_id: string;
  query_type: string;
  args: string | undefined | null;
};
export type TemporalWorkflowQueryOutput =
  | {
    Ok: {
      data: Array<string>;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export async function temporal_workflow_query(
  a0: TemporalWorkflowQueryInput,
): Promise<TemporalWorkflowQueryOutput> {
  try {
    const out = await Meta.temporal.workflowQuery(a0);
    return { Ok: { data: out } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type WasiVmInitConfig = {
  vm_name: string;
  pylib_path: string;
  wasi_mod_path: string;
  preopens: Array<string>;
};
export type WasiVmSetupOut =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };
export type WasiVmUnregisterInp = {
  vm_name: string;
};

export function register_virtual_machine(a0: WasiVmInitConfig): WasiVmSetupOut {
  try {
    Meta.python.registerVm(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export function unregister_virtual_machine(
  a0: WasiVmUnregisterInp,
): WasiVmSetupOut {
  try {
    Meta.python.unregisterVm(a0.vm_name);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type WasiReactorOut =
  | {
    Ok: {
      res: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };
export type PythonApplyInp = {
  vm: string;
  id: number;
  name: string;
  /**
   * stringified json array
   */
  args: string;
};
export type PythonRegisterInp = {
  vm: string;
  name: string;
  code: string;
};
export type PythonUnregisterInp = {
  vm: string;
  name: string;
};
export function register_lambda(a0: PythonRegisterInp): WasiReactorOut {
  try {
    const res = Meta.python.registerLambda(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function apply_lambda(a0: PythonApplyInp): WasiReactorOut {
  try {
    const res = Meta.python.applyLambda(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function unregister_lambda(a0: PythonUnregisterInp): WasiReactorOut {
  try {
    const res = Meta.python.unregisterLambda(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function apply_def(a0: PythonApplyInp): WasiReactorOut {
  try {
    const res = Meta.python.applyDef(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function register_def(a0: PythonRegisterInp): WasiReactorOut {
  try {
    const res = Meta.python.registerDef(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function unregister_def(a0: PythonUnregisterInp): WasiReactorOut {
  try {
    const res = Meta.python.unregisterDef(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function register_module(a0: PythonRegisterInp): WasiReactorOut {
  try {
    const res = Meta.python.registerModule(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export function unregister_module(a0: PythonUnregisterInp): WasiReactorOut {
  try {
    const res = Meta.python.unregisterModule(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type PrismaRegisterEngineInp = {
  datamodel: string;
  engine_name: string;
};
export type PrismaRegisterEngineOut =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function prisma_register_engine(
  a0: PrismaRegisterEngineInp,
): Promise<PrismaRegisterEngineOut> {
  try {
    await Meta.prisma.registerEngine(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type PrismaUnregisterEngineInp = {
  engine_name: string;
};
export type PrismaUnregisterEngineOut =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function prisma_unregister_engine(
  a0: PrismaUnregisterEngineInp,
): Promise<PrismaUnregisterEngineOut> {
  try {
    await Meta.prisma.unregisterEngine(a0.engine_name);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type PrismaQueryInp = {
  engine_name: string;
  // deno-lint-ignore no-explicit-any
  query: any;
  datamodel: string;
};
export type PrismaQueryOut =
  | {
    Ok: {
      res: string;
    };
  }
  | {
    Err: {
      message: string;
    };
  };
export async function prisma_query(
  a0: PrismaQueryInp,
): Promise<PrismaQueryOut> {
  try {
    const res = await Meta.prisma.query(a0);
    return { Ok: { res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
  /*
  try {
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
   * */
}

export type PrismaDiffInp = {
  datasource: string;
  datamodel: string;
  script: boolean;
};
export type PrismaDiffOut =
  | {
    Ok: {
      diff: string | undefined | null;
    };
  }
  | {
    Err: {
      message: string;
    };
  };

export async function prisma_diff(a0: PrismaDiffInp) {
  try {
    const res = await Meta.prisma.diff(a0);
    return { Ok: { diff: res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type PrismaApplyResult =
  | {
    Err: {
      message: string;
    };
  }
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
export type PrismaDevInp = {
  datasource: string;
  datamodel: string;
  migrations: string | undefined | null;
  reset_database: boolean;
};

export async function prisma_apply(
  a0: PrismaDevInp,
): Promise<PrismaApplyResult> {
  try {
    return await Meta.prisma.apply(a0) as PrismaApplyResult;
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type PrismaDeployInp = {
  datasource: string;
  datamodel: string;
  migrations: string;
};
export type PrismaDeployOut =
  | {
    Err: {
      message: string;
    };
  }
  | {
    Ok: {
      migration_count: number;
      applied_migrations: Array<string>;
    };
  };

export async function prisma_deploy(
  a0: PrismaDeployInp,
): Promise<PrismaDeployOut> {
  try {
    const res = await Meta.prisma.deploy(a0);
    return { Ok: res };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type PrismaCreateInp = {
  datasource: string;
  datamodel: string;
  migrations: string | undefined | null;
  migration_name: string;
  apply: boolean;
};
export type PrismaCreateResult =
  | {
    Err: {
      message: string;
    };
  }
  | {
    Ok: {
      created_migration_name: string | undefined | null;
      migrations: string | undefined | null;
      apply_err: string | undefined | null;
    };
  };

export async function prisma_create(
  a0: PrismaCreateInp,
): Promise<PrismaCreateResult> {
  try {
    const res = await Meta.prisma.create(a0);
    return { Ok: res };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type PrismaResetInp = {
  datasource: string;
};
export type PrismaResetResult =
  | {
    Err: {
      message: string;
    };
  }
  | {
    Ok: {
      reset: boolean;
    };
  };
export async function prisma_reset(
  a0: PrismaResetInp,
): Promise<PrismaResetResult> {
  try {
    const res = await Meta.prisma.reset(a0.datasource);
    return { Ok: { reset: res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
export type UnpackInp = {
  dest: string;
  migrations: string;
};
export type UnpackResult =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };
export function unpack(a0: UnpackInp): UnpackResult {
  try {
    Meta.prisma.unpack(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type ArchiveInp = {
  path: string;
};
export type ArchiveResult =
  | {
    Ok: {
      base64: string | undefined | null;
    };
  }
  | {
    Err: {
      message: string;
    };
  };
export function archive(a0: ArchiveInp): ArchiveResult {
  try {
    const res = Meta.prisma.archive(a0.path);
    return { Ok: { base64: res } };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
