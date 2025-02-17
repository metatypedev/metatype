// const { core } = Deno[Deno.internal];
const { core } = Deno;
const { ops } = core;
// const fastops = core.ensureFastOps(); // TODO: investigate

// NOTE: use the following import if ever switching to snaphsots
// import * as ops from "ext:core/ops";

function getOp(name) {
  // Note: always get the op right away.
  // the core.ops object is a proxy
  // that retrieves the named op
  // when requested i.e. not a
  // hashmap prepopulated by the ops.
  // If we don't get the op now, the
  // proxy behvior won't be avail later at runtime
  const op = ops[name];
  if (!op) {
    throw Error(`op: ${name} not found`);
  }
  return op;
}

/**
 * @typedef {import('./runtime.d.ts').MetaNS} MetaNS
 */

/**
 * @type {MetaNS}
 */
const Meta = {
  prisma: {
    registerEngine: getOp("op_prisma_register_engine"),
    unregisterEngine: getOp("op_prisma_unregister_engine"),
    query: getOp("op_prisma_query"),
    diff: getOp("op_prisma_diff"),
    apply: getOp("op_prisma_apply"),
    deploy: getOp("op_prisma_deploy"),
    create: getOp("op_prisma_create"),
    reset: getOp("op_prisma_reset"),
    unpack: getOp("op_unpack"),
    archive: getOp("op_archive"),
  },
  temporal: {
    clientRegister: getOp("op_temporal_register"),
    clientUnregister: getOp("op_temporal_unregister"),
    workflowStart: getOp("op_temporal_workflow_start"),
    workflowSignal: getOp("op_temporal_workflow_signal"),
    workflowQuery: getOp("op_temporal_workflow_query"),
    workflowDescribe: getOp("op_temporal_workflow_describe"),
  },
  version: getOp("op_get_version"),
  typegraphValidate: getOp("op_typegraph_validate"),
  validatePrismaRuntimeData: getOp("op_validate_prisma_runtime_data"),
  wasmtimeWit: getOp("op_wasmtime_wit"),
  wit_wire: {
    init: getOp("op_wit_wire_init"),
    destroy: getOp("op_wit_wire_destroy"),
    handle: getOp("op_wit_wire_handle"),
  },
  substantial: {
    storeCreateOrGetRun: getOp("op_sub_store_create_or_get_run"),
    storePersistRun: getOp("op_sub_store_persist_run"),
    storeAddSchedule: getOp("op_sub_store_add_schedule"),
    storeReadSchedule: getOp("op_sub_store_read_schedule"),
    storeCloseSchedule: getOp("op_sub_store_close_schedule"),
    agentNextRun: getOp("op_sub_agent_next_run"),
    agentActiveLeases: getOp("op_sub_agent_active_leases"),
    agentAcquireLease: getOp("op_sub_agent_acquire_lease"),
    agentRenewLease: getOp("op_sub_agent_renew_lease"),
    agentRemoveLease: getOp("op_sub_agent_remove_lease"),
    metadataReadAll: getOp("op_sub_metadata_read_all"),
    metadataAppend: getOp("op_sub_metadata_append"),
    metadataWriteWorkflowLink: getOp("op_sub_metadata_write_workflow_link"),
    metadataReadWorkflowLinks: getOp("op_sub_metadata_read_workflow_links"),
    metadataWriteParentChildLink: getOp(
      "op_sub_metadata_write_parent_child_link",
    ),
    metadataEnumerateAllChildren: getOp(
      "op_sub_metadata_enumerate_all_children",
    ),
  },
  grpc: {
    register: getOp("op_grpc_register"),
    unregister: getOp("op_grpc_unregister"),
    callGrpcMethod: getOp("op_call_grpc_method"),
  },
  py_validation: {
    validate: getOp("op_validate"),
  },
};

globalThis.____Meta = Meta;
