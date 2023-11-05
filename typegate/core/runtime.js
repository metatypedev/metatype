// const { core } = Deno[Deno.internal];
const { core } = Deno;
const { ops } = core;
// const { } = core.ensureFastOps(); // TODO: investigate

globalThis.Meta = {
  prisma: {
    // NOTE: we need to curry async ops
    registerEngine: (arg) => ops.op_prisma_register_engine(arg),
    unregisterEngine: (arg) => ops.op_prisma_unregister_engine(arg),
    query: (arg) => ops.op_prisma_query(arg),
    diff: (arg) => ops.op_prisma_diff(arg),
    apply: (arg) => ops.op_prisma_apply(arg),
    deploy: (arg) => ops.op_prisma_deploy(arg),
    create: (arg) => ops.op_prisma_create(arg),
    reset: (arg) => ops.op_prisma_reset(arg),
    // no need to curry sync ops
    unpack: ops.op_unpack,
    archive: ops.op_archive,
  },
  temporal: {
    clientRegister: (arg) => ops.op_temporal_register(arg),
    clientUnregister: ops.op_temporal_unregister,
    workflowStart: (arg) => ops.op_temporal_workflow_start(arg),
    workflowSignal: (arg) => ops.op_temporal_workflow_signal(arg),
    workflowQuery: (arg) => ops.op_temporal_workflow_query(arg),
    workflowDescribe: (arg) => ops.op_temporal_workflow_describe(arg),
  },
  python: {
    registerVm: ops.op_register_virtual_machine,
    unregisterVm: ops.op_unregister_virtual_machine,
    registerLambda: ops.op_register_lambda,
    unregisterLambda: ops.op_unregister_lambda,
    applyLambda: ops.op_apply_lambda,
    registerDef: ops.op_register_def,
    unregisterDef: ops.op_unregister_def,
    applyDef: ops.op_apply_def,
    registerModule: ops.op_register_module,
    unregisterModule: ops.op_unregister_module,
  },
  version: ops.op_get_version,
  typescriptFormatCode: ops.op_typescript_format_code,
  typegraphValidate: ops.op_typegraph_validate,
  validatePrismaRuntimeData: ops.op_validate_prisma_runtime_data,
  wasmedgeWasi: ops.op_wasmedge_wasi,
};
