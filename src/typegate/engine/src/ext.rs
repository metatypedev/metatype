// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::interlude::*;
use crate::{
    py_validation,
    runtimes::{grpc, prisma, substantial, temporal, wasm, wit_wire},
    typegraph,
};

use crate::OpDepInjector;

pub fn extensions(seed: OpDepInjector) -> Vec<deno_core::Extension> {
    vec![tg_metatype_ext::init_ops_and_esm(seed)]
}

// NOTE: this is not a proc macro so ordering of sections is important
deno_core::extension!(
    tg_metatype_ext,
    ops = [
        crate::op_get_version,
        typegraph::op_typegraph_validate,
        typegraph::op_validate_prisma_runtime_data,
        wasm::op_wasmtime_wit,
        temporal::op_temporal_register,
        temporal::op_temporal_unregister,
        temporal::op_temporal_workflow_start,
        temporal::op_temporal_workflow_query,
        temporal::op_temporal_workflow_signal,
        temporal::op_temporal_workflow_describe,
        prisma::op_prisma_register_engine,
        prisma::op_prisma_unregister_engine,
        prisma::op_prisma_query,
        prisma::op_prisma_diff,
        prisma::op_prisma_apply,
        prisma::op_prisma_deploy,
        prisma::op_prisma_create,
        prisma::op_prisma_reset,
        prisma::op_unpack,
        prisma::op_archive,
        wit_wire::op_wit_wire_init,
        wit_wire::op_wit_wire_handle,
        grpc::op_grpc_register,
        grpc::op_grpc_unregister,
        grpc::op_call_grpc_method,
        substantial::op_sub_store_create_or_get_run,
        substantial::op_sub_store_persist_run,
        substantial::op_sub_store_add_schedule,
        substantial::op_sub_store_close_schedule,
        substantial::op_sub_store_read_schedule,
        substantial::op_sub_agent_acquire_lease,
        substantial::op_sub_agent_active_leases,
        substantial::op_sub_agent_next_run,
        substantial::op_sub_agent_remove_lease,
        substantial::op_sub_agent_renew_lease,
        substantial::op_sub_metadata_append,
        substantial::op_sub_metadata_read_all,
        substantial::op_sub_metadata_read_workflow_links,
        substantial::op_sub_metadata_write_workflow_link,
        substantial::op_sub_metadata_write_parent_child_link,
        substantial::op_sub_metadata_enumerate_all_children,
        substantial::op_sub_run_ensure_determinism,
        py_validation::op_validate,

        // FIXME(yohe): this test broke and has proven difficult to fix
        // #[cfg(test)]
        // tests::op_obj_go_round,
    ],
    // esm_entry_point = "ext:tg_metatype_ext/00_runtime.js",
    // esm = ["00_runtime.js"],
    // parameters for when we initialize our extensions
    options = { seed: OpDepInjector, },
    // initialize the OpState
    state = |state, opt| {
        opt.seed.inject(state);
    },
    customizer = |ext: &mut deno_core::Extension| {
        ext.esm_files.to_mut().push(
            deno_core::ExtensionFileSource::new(
                "ext:tg_metatype_ext/00_runtime.js",
                deno_core::ascii_str_include!("../00_runtime.js")
            )
        );
        ext.esm_entry_point = Some("ext:tg_metatype_ext/00_runtime.js");
    },
    docs = "Internal metatype extension for typegate usage.",
);

#[cfg(test)]
pub mod tests {
    #[rustfmt::skip]
    use deno_core as deno_core; // necessary for re-exported macros to work
    use std::sync::Arc;

    use super::*;

    pub struct TestCtx {
        pub val: usize,
    }

    #[derive(Serialize)]
    #[serde(crate = "serde")]
    pub struct Out {
        a: usize,
        b: String,
    }

    #[derive(Deserialize)]
    #[serde(crate = "serde")]
    pub struct In {
        a: usize,
        b: String,
    }

    // FIXME: this is also broken for some reason
    #[deno_core::op2]
    #[serde]
    pub fn op_obj_go_round(#[state] ctx: &TestCtx, #[serde] incoming: In) -> Result<Out, OpErr> {
        Ok(Out {
            a: incoming.a + ctx.val,
            b: incoming.b,
        })
    }

    // FIXME: this test is broken for some reason
    #[tokio::test(flavor = "current_thread")]
    #[ignore]
    async fn test_obj_go_round() -> Result<()> {
        let deno_factory = deno::factory::CliFactory::from_flags(
            deno::args::Flags {
                unstable_config: deno::deno_lib::args::UnstableConfig {
                    legacy_flag_enabled: true,
                    ..Default::default()
                },
                ..Default::default()
            }
            .into(),
        )
        .with_custom_ext_cb(Arc::new(|| extensions(OpDepInjector::from_env())));
        let worker_factory = deno_factory.create_cli_main_worker_factory().await?;
        let main_module = "data:application/javascript;Meta.get_version()".parse()?;
        // let desc_parser = deno_runtime::permissions::RuntimePermissionDescriptorParser::new(
        //     std::sync::Arc::new(deno_runtime::deno_fs::RealFs),
        // );
        // let desc_parser = std::sync::Arc::new(desc_parser);
        // let permissions = PermissionsContainer::allow_all(desc_parser.);
        let mut worker = worker_factory
            .create_main_worker(deno_runtime::WorkerExecutionMode::Run, main_module)
            .await?;
        worker.execute_script_static(
            deno_core::located_script_name!(),
            r#"
console.log({ops: Deno[Deno.internal].core.ops})
// import * as ops from "ext:core/ops";
if (Deno[Deno.internal].core.ops.op_obj_go_round({ a: 10, b: "hey"}).a != 20) {
    throw Error("assert failed");
}
"#,
        )?;
        Ok(())
    }
}
