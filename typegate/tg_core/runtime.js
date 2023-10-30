// const { core } = Deno[Deno.internal];
const { core } = Deno;
const { ops } = core;
const { op_obj_go_round, op_validate_prisma_runtime_data } = core
  .ensureFastOps();

globalThis.Meta = {
  version: ops.op_get_version,
  obj_go_round: op_obj_go_round,
  typescriptFormatCode: ops.op_typescript_format_code,
  typegraphValidate: ops.op_typegraph_validate,
  validatePrismaRuntimeData: op_validate_prisma_runtime_data,
  foobar: () => {
    return ops.op_foobar();
  },
  assert: (val) => {
    if (!val) throw Error("assertion failed");
  },
};
