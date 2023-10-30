// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::interlude::*;

#[rustfmt::skip]
use deno_core as deno_core; // necessary for re-exported macros to work

pub fn extensions(ctx: Context) -> Vec<deno_core::Extension> {
    vec![tg_metatype_ext::init_ops_and_esm(ctx)]
}

pub struct Context {
    pub val: usize,
    // rt: tokio::runtime::Runtime,
}

// NOTE: this is not a proc macro so ordering of sections is important
deno_core::extension!(
    tg_metatype_ext,
    ops = [
        op_get_version,
        op_obj_go_round,
        crate::typescript::op_typescript_format_code,
        crate::typegraph::op_typegraph_validate,
        crate::typegraph::op_validate_prisma_runtime_data,
    ],
    esm_entry_point = "ext:tg_metatype_ext/runtime.js",
    esm = ["runtime.js"],
    // parameters for when we initialize our extensions
    options = { ctx: Context, },
    // initialize the OpState
    state = |state, opt| {
        state.put(opt.ctx);
    },
    docs = "Internal metatype extension for typegate usage.",
);

#[deno_core::op2]
#[string]
fn op_get_version() -> &'static str {
    common::get_version()
}

#[derive(serde::Serialize)]
#[serde(crate = "serde")]
struct Out {
    a: usize,
    b: String,
}
#[derive(serde::Deserialize)]
#[serde(crate = "serde")]
struct In {
    a: usize,
    b: String,
}

#[deno_core::op2]
#[serde]
fn op_obj_go_round(#[state] ctx: &Context, #[serde] incoming: In) -> Result<Out> {
    Ok(Out {
        a: incoming.a + ctx.val,
        b: incoming.b,
    })
}

#[cfg(test)]
mod tests {
    use deno_runtime::permissions::PermissionsContainer;
    use std::sync::Arc;

    use super::*;

    #[tokio::test(flavor = "current_thread")]
    async fn test_obj_go_round() -> Result<()> {
        let deno_factory = deno::factory::CliFactory::from_flags(deno::args::Flags {
            unstable: true,
            ..Default::default()
        })
        .await?
        .with_custom_ext_cb(Arc::new(|| extensions(Context { val: 10 })));
        let worker_factory = deno_factory.create_cli_main_worker_factory().await?;
        let main_module = "data:application/javascript;Meta.get_version()".parse()?;
        let permissions = PermissionsContainer::allow_all();
        let mut worker = worker_factory
            .create_main_worker(main_module, permissions)
            .await?;
        worker.execute_script_static(
            deno_core::located_script_name!(),
            r#"
Meta.assert(Meta.obj_go_round({ a: 10, b: "hey"}).a == 20)
"#,
        )?;
        Ok(())
    }

    #[tokio::test(flavor = "current_thread")]
    async fn test_get_version() -> Result<()> {
        let deno_factory = deno::factory::CliFactory::from_flags(deno::args::Flags {
            unstable: true,
            ..Default::default()
        })
        .await?
        .with_custom_ext_cb(Arc::new(|| extensions(Context { val: 10 })));
        let worker_factory = deno_factory.create_cli_main_worker_factory().await?;
        let main_module = "data:application/javascript;Meta.get_version()".parse()?;
        let permissions = PermissionsContainer::allow_all();
        let mut worker = worker_factory
            .create_main_worker(main_module, permissions)
            .await?;
        worker.execute_script_static(
            deno_core::located_script_name!(),
            r#"
Meta.assert(typeof Meta.version() == "string")
"#,
        )?;
        Ok(())
    }
}
