// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use crate::config::Config;

use super::utils::{map_from_object, object_from_map};
use anyhow::Result;
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use typescript::parser::{transform_module, transform_script};

pub type PostProcessor = fn(&mut Typegraph, &Config) -> Result<()>;

// postprocessors
static DEFAULT: &[PostProcessor] = &[deno_rt::postprocess];
static DEPLOY: &[PostProcessor] = &[prisma_rt::embed_prisma_migrations];

/// Perform some postprocessing on the typegraph we got from Python
pub fn postprocess(mut typegraph: Typegraph, config: &Config, deploy: bool) -> Result<Typegraph> {
    for p in DEFAULT {
        p(&mut typegraph, config)?;
    }
    if deploy {
        for p in DEPLOY {
            p(&mut typegraph, config)?;
        }
    }
    Ok(typegraph)
}

mod deno_rt {
    use crate::typegraph::utils::{get_materializers, get_runtimes};

    use super::*;

    fn insert_and_reformat_scripts(mat: &mut Materializer) -> Result<()> {
        match mat.name.as_str() {
            "function" => {
                let mut mat_data: FunctionMatData = object_from_map(std::mem::take(&mut mat.data))?;
                // TODO check variable `_my_lambda` exists and is a function expression/lambda
                mat_data.script = transform_script(mat_data.script)?;
                mat.data = map_from_object(mat_data)?;
            }
            "module" => {
                let mut mat_data: ModuleMatData = object_from_map(std::mem::take(&mut mat.data))?;
                if !mat_data.code.starts_with("file:") {
                    // TODO check imported functions exist
                    mat_data.code = transform_module(mat_data.code)?;
                }
                mat.data = map_from_object(mat_data)?;
            }
            _ => {}
        }
        Ok(())
    }

    pub fn postprocess(typegraph: &mut Typegraph, _c: &Config) -> Result<()> {
        for rt_idx in get_runtimes(typegraph, "deno").into_iter() {
            for mat_idx in get_materializers(typegraph, rt_idx as u32) {
                // insert_and_reformat_scripts(typegraph.materializers.get_mut(mat_idx).unwrap());
                insert_and_reformat_scripts(&mut typegraph.materializers[mat_idx])?;
            }
        }
        Ok(())
    }
}

mod prisma_rt {
    use super::*;
    use anyhow::Context;
    use common::{archive, typegraph::PrismaRuntimeData};

    use crate::{
        cli::prisma::PrismaArgs,
        typegraph::utils::{map_from_object, object_from_map},
    };

    pub fn embed_prisma_migrations(tg: &mut Typegraph, config: &Config) -> Result<()> {
        let prisma_config = &config.typegraphs.materializers.prisma;
        let tg_name = tg.name().context("Getting typegraph name")?;

        let mut runtimes = std::mem::take(&mut tg.runtimes);
        for rt in runtimes.iter_mut().filter(|rt| rt.name == "prisma") {
            let mut rt_data: PrismaRuntimeData = object_from_map(std::mem::take(&mut rt.data))?;
            let rt_name = &rt_data.name;
            let base_path = prisma_config.base_migrations_path(
                &PrismaArgs {
                    typegraph: tg_name.clone(),
                    runtime: Some(rt_data.name.clone()),
                    migrations: None,
                },
                config,
            );
            let path = base_path.join(rt_name);
            if path.try_exists()? {
                rt_data.migrations = Some(archive::archive(base_path.join(rt_name))?);
            }
            rt.data = map_from_object(rt_data)?;
        }

        tg.runtimes = runtimes;

        Ok(())
    }
}
