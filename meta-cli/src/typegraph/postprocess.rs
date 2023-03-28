// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::sync::{Arc, RwLock};

use crate::config::Config;

use super::utils::{map_from_object, object_from_map};
use anyhow::Result;
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use typescript::parser::{transform_module, transform_script};

pub type PostProcessor<T = Typegraph> =
    Arc<RwLock<dyn Fn(&mut T, &Config) -> Result<()> + Sync + Send>>;

pub trait PostProcess {
    fn apply(&mut self, postprocessors: &[PostProcessor<Self>], config: &Config) -> Result<()> {
        for pp in postprocessors {
            pp.read().unwrap()(self, config)?;
        }
        Ok(())
    }
}

impl PostProcess for Typegraph {}

pub mod deno_rt {
    use crate::typegraph::utils::{get_materializers, get_runtimes};

    use super::*;

    fn reformat_materializer_script(mat: &mut Materializer) -> Result<()> {
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

    fn reformat_scripts_fn(typegraph: &mut Typegraph, _c: &Config) -> Result<()> {
        for rt_idx in get_runtimes(typegraph, "deno").into_iter() {
            for mat_idx in get_materializers(typegraph, rt_idx as u32) {
                reformat_materializer_script(&mut typegraph.materializers[mat_idx])?;
            }
        }
        Ok(())
    }

    pub fn reformat_scripts() -> PostProcessor {
        Arc::new(RwLock::new(reformat_scripts_fn))
    }
}

pub mod prisma_rt {
    use super::*;
    use anyhow::Context;
    use common::{archive, typegraph::PrismaRuntimeData};

    use crate::{
        cli::prisma::PrismaArgs,
        typegraph::utils::{map_from_object, object_from_map},
    };

    pub fn embed_prisma_migrations() -> PostProcessor {
        Arc::new(RwLock::new(embed_prisma_migrations_fn))
    }

    fn embed_prisma_migrations_fn(tg: &mut Typegraph, config: &Config) -> Result<()> {
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
