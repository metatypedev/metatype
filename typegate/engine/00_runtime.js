// const { core } = Deno[Deno.internal];
// const { core } = Deno;
// const { getOp('} = core;
// const fastgetOp('= core.ensureFastOps(); // TODO: investigate
import * as ops from "ext:core/ops";

function getOp(name) {
  const op = ops[name];
  if (!op) {
    throw Error(`op: ${name} not found`);
  }
  return op;
}

// console.log({ getOp('});
globalThis.Meta = {
  prisma: {
    // NOTE: we need to curry async ops
    registerEngine: (arg) => getOp("op_prisma_register_engine")(arg),
    unregisterEngine: (arg) => getOp("op_prisma_unregister_engine")(arg),
    query: (arg) => getOp("op_prisma_query")(arg),
    diff: (arg) => getOp("op_prisma_diff")(arg),
    apply: (arg) => getOp("op_prisma_apply")(arg),
    deploy: (arg) => getOp("op_prisma_deploy")(arg),
    create: (arg) => getOp("op_prisma_create")(arg),
    reset: (arg) => getOp("op_prisma_reset")(arg),
    // no need to curry sync ops
    unpack: getOp("op_unpack"),
    archive: getOp("op_archive"),
  },
  temporal: {
    clientRegister: (arg) => getOp("op_temporal_register")(arg),
    clientUnregister: getOp("op_temporal_unregister"),
    workflowStart: (arg) => getOp("op_temporal_workflow_start")(arg),
    workflowSignal: (arg) => getOp("op_temporal_workflow_signal")(arg),
    workflowQuery: (arg) => getOp("op_temporal_workflow_query")(arg),
    workflowDescribe: (arg) => getOp("op_temporal_workflow_describe")(arg),
  },
  python: {
    registerVm: getOp("op_register_virtual_machine"),
    unregisterVm: getOp("op_unregister_virtual_machine"),
    registerLambda: getOp("op_register_lambda"),
    unregisterLambda: getOp("op_unregister_lambda"),
    applyLambda: getOp("op_apply_lambda"),
    registerDef: getOp("op_register_def"),
    unregisterDef: getOp("op_unregister_def"),
    applyDef: getOp("op_apply_def"),
    registerModule: getOp("op_register_module"),
    unregisterModule: getOp("op_unregister_module"),
  },
  deno: {
    transformTypescript: getOp("op_deno_transform_typescript"),
  },
  version: getOp("op_get_version"),
  typescriptFormatCode: getOp("op_typescript_format_code"),
  typegraphValidate: getOp("op_typegraph_validate"),
  validatePrismaRuntimeData: getOp("op_validate_prisma_runtime_data"),
  wasmedgeWasi: getOp("op_wasmedge_wasi"),
};
