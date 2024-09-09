// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import type {
  CallGrpcMethodInput,
  GrpcRegisterInput,
  ParsedDiff,
  PrismaApplyOut,
  PrismaCreateOut,
  PrismaDeployOut,
  PrismaQueryInp,
  PrismaRegisterEngineInp,
  TemporalRegisterInput,
  TemporalWorkflowDescribeInput,
  TemporalWorkflowDescribeOutput,
  TemporalWorkflowQueryInput,
  TemporalWorkflowSignalInput,
  TemporalWorkflowStartInput,
  WasmInput,
} from "./runtime.js";

export function get_version() {
  return "0.4.10"
  // return Meta.version();
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

export function wasmtime_wit(a0: WasmInput): Promise<WasiOutput> {
  try {
    const out = Meta.wasmtimeWit(a0);
    return Promise.resolve({ Ok: { res: out } });
  } catch (err) {
    return Promise.resolve({ Err: { message: err.toString() } });
  }
}

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

export type TemporalWorkflowDescribeRes =
  | {
    Ok: TemporalWorkflowDescribeOutput;
  }
  | {
    Err: {
      message: string;
    };
  };

export async function temporal_workflow_describe(
  a0: TemporalWorkflowDescribeInput,
): Promise<TemporalWorkflowDescribeRes> {
  try {
    const out = await Meta.temporal.workflowDescribe(a0);
    return { Ok: out };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

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

export async function prisma_diff(
  a0: PrismaDiffInp,
): Promise<[string, ParsedDiff[]] | null | undefined> {
  return await Meta.prisma.diff(a0);
}

export type PrismaApplyResult =
  | {
    Err: {
      message: string;
    };
  }
  | PrismaApplyOut;
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
export type PrismaDeployRes =
  | {
    Err: {
      message: string;
    };
  }
  | { Ok: PrismaDeployOut };

export async function prisma_deploy(
  a0: PrismaDeployInp,
): Promise<PrismaDeployRes> {
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
  | { Ok: PrismaCreateOut };

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

export type GrpcRegisterOutput =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function grpc_register(
  a0: GrpcRegisterInput,
): Promise<GrpcRegisterOutput> {
  try {
    await Meta.grpc.register(a0);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type GrpcUnregisterInput = {
  client_id: string;
};

export type GrpcUnRegisterOutput =
  | "Ok"
  | {
    Err: {
      message: string;
    };
  };

export async function grpc_unregister(
  a0: GrpcUnregisterInput,
): Promise<GrpcUnRegisterOutput> {
  try {
    await Meta.grpc.unregister(a0.client_id);
    return "Ok";
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}

export type CallGrpcMethodOutput =
  | {
    Ok: string;
  }
  | {
    Err: {
      message: string;
    };
  };

export async function call_grpc_method(
  a0: CallGrpcMethodInput,
): Promise<CallGrpcMethodOutput> {
  try {
    return { Ok: await Meta.grpc.callGrpcMethod(a0) };
  } catch (err) {
    return { Err: { message: err.toString() } };
  }
}
