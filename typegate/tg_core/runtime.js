// const { core } = Deno[Deno.internal];
const { core } = Deno;
const { ops } = core;
const { op_obj_go_round } = core.ensureFastOps();
globalThis.Meta = {
  version: ops.op_get_version,
  obj_go_round: op_obj_go_round,
  typescript_format_code: ops.op_typescript_format_code,
  foobar: () => {
    return ops.op_foobar();
  },
  assert: (val) => {
    if (!val) throw Error("assertion failed");
  },
};
