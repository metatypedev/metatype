// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
use crate::{
    runtimes::{deno_rt, prisma, temporal, wasm, wit_wire},
    typegraph, typescript,
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
        // #[cfg(test)]
        // tests::op_obj_go_round,
        typescript::op_typescript_format_code,
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
        deno_rt::op_deno_transform_typescript,
        wit_wire::op_wit_wire_init,
        wit_wire::op_wit_wire_handle,
        wit_wire::op_wit_wire_destroy,
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
    use deno_runtime::permissions::PermissionsContainer;
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

    #[deno_core::op2]
    #[serde]
    pub fn op_obj_go_round(#[state] ctx: &TestCtx, #[serde] incoming: In) -> Result<Out> {
        Ok(Out {
            a: incoming.a + ctx.val,
            b: incoming.b,
        })
    }

    // FIXME: this test is broken for some reason
    #[tokio::test(flavor = "current_thread")]
    #[ignore]
    async fn test_obj_go_round() -> Result<()> {
        let deno_factory = deno::factory::CliFactory::from_flags(deno::args::Flags {
            unstable_config: deno::args::UnstableConfig {
                legacy_flag_enabled: true,
                ..Default::default()
            },
            ..Default::default()
        })?
        .with_custom_ext_cb(Arc::new(|| extensions(OpDepInjector::from_env())));
        let worker_factory = deno_factory.create_cli_main_worker_factory().await?;
        let main_module = "data:application/javascript;Meta.get_version()".parse()?;
        let permissions = PermissionsContainer::allow_all();
        let mut worker = worker_factory
            .create_main_worker(
                deno_runtime::WorkerExecutionMode::Run,
                main_module,
                permissions,
            )
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
