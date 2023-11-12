// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;
use crate::{
    runtimes::{prisma, python::python_bindings, temporal, wasmedge},
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
        #[cfg(test)]
        tests::op_obj_go_round,
        typescript::op_typescript_format_code,
        typegraph::op_typegraph_validate,
        typegraph::op_validate_prisma_runtime_data,
        wasmedge::op_wasmedge_wasi,
        temporal::op_temporal_register,
        temporal::op_temporal_unregister,
        temporal::op_temporal_workflow_start,
        temporal::op_temporal_workflow_query,
        temporal::op_temporal_workflow_signal,
        temporal::op_temporal_workflow_describe,
        python_bindings::op_register_virtual_machine,
        python_bindings::op_unregister_virtual_machine,
        python_bindings::op_register_lambda,
        python_bindings::op_unregister_lambda,
        python_bindings::op_apply_lambda,
        python_bindings::op_register_def,
        python_bindings::op_unregister_def,
        python_bindings::op_apply_def,
        python_bindings::op_register_module,
        python_bindings::op_unregister_module,
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
    ],
    esm_entry_point = "ext:tg_metatype_ext/runtime.js",
    esm = ["runtime.js"],
    // parameters for when we initialize our extensions
    options = { seed: OpDepInjector, },
    // initialize the OpState
    state = |state, opt| {
        opt.seed.inject(state);
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

    #[tokio::test(flavor = "current_thread")]
    async fn test_obj_go_round() -> Result<()> {
        let deno_factory = deno::factory::CliFactory::from_flags(deno::args::Flags {
            unstable: true,
            ..Default::default()
        })
        .await?
        .with_custom_ext_cb(Arc::new(|| extensions(OpDepInjector::from_env())));
        let worker_factory = deno_factory.create_cli_main_worker_factory().await?;
        let main_module = "data:application/javascript;Meta.get_version()".parse()?;
        let permissions = PermissionsContainer::allow_all();
        let mut worker = worker_factory
            .create_main_worker(main_module, permissions)
            .await?;
        worker.execute_script_static(
            deno_core::located_script_name!(),
            r#"
if (Deno[Deno.internal].core.ops.op_obj_go_round({ a: 10, b: "hey"}).a != 20) {
    throw Error("assert failed");
}
"#,
        )?;
        Ok(())
    }
}
