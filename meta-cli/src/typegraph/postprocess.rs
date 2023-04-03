// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::sync::{Arc, RwLock};

use crate::config::Config;

use super::utils::{map_from_object, object_from_map};
use anyhow::Result;
use common::typegraph::{FunctionMatData, Materializer, ModuleMatData, Typegraph};
use typescript::parser::{transform_module, transform_script};

pub trait PostProcessor {
    fn postprocess(&self, tg: &mut Typegraph, config: &Config) -> Result<()>;
}

struct GenericPostProcessor<F: Fn(&mut Typegraph, &Config) -> Result<()> + Sync + Send>(F);

impl<F> PostProcessor for GenericPostProcessor<F>
where
    F: Fn(&mut Typegraph, &Config) -> Result<()> + Sync + Send,
{
    fn postprocess(&self, tg: &mut Typegraph, config: &Config) -> Result<()> {
        self.0(tg, config)
    }
}

#[derive(Clone)]
pub struct PostProcessorWrapper(Arc<RwLock<Box<dyn PostProcessor + Sync + Send>>>);

impl PostProcessorWrapper {
    pub fn generic(
        pp: impl Fn(&mut Typegraph, &Config) -> Result<()> + Sync + Send + 'static,
    ) -> Self {
        PostProcessorWrapper::from(GenericPostProcessor(pp))
    }
}

impl<T> From<T> for PostProcessorWrapper
where
    T: PostProcessor + Send + Sync + 'static,
{
    fn from(pp: T) -> Self {
        PostProcessorWrapper(Arc::new(RwLock::new(Box::new(pp))))
    }
}

pub fn apply_all<'a>(
    postprocessors: impl Iterator<Item = &'a PostProcessorWrapper>,
    tg: &mut Typegraph,
    config: &Config,
) -> Result<()> {
    for pp in postprocessors {
        pp.0.read().unwrap().postprocess(tg, config)?;
    }
    Ok(())
}

pub use deno_rt::Codegen;
pub use deno_rt::ReformatScripts;
pub use prisma_rt::EmbedPrismaMigrations;

pub mod deno_rt {
    use std::path::Path;

    use crate::typegraph::utils::{get_materializers, get_runtimes};
    use anyhow::{anyhow, Context};

    use super::*;

    pub struct ReformatScripts;

    impl From<ReformatScripts> for PostProcessorWrapper {
        fn from(_val: ReformatScripts) -> Self {
            PostProcessorWrapper::generic(reformat_scripts)
        }
    }

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

    fn reformat_scripts(typegraph: &mut Typegraph, _c: &Config) -> Result<()> {
        for rt_idx in get_runtimes(typegraph, "deno").into_iter() {
            for mat_idx in get_materializers(typegraph, rt_idx as u32) {
                reformat_materializer_script(&mut typegraph.materializers[mat_idx])?;
            }
        }
        Ok(())
    }

    pub struct Codegen;
    impl PostProcessor for Codegen {
        fn postprocess(&self, tg: &mut Typegraph, _config: &Config) -> Result<()> {
            crate::codegen::deno::codegen(tg, tg.path.as_ref().unwrap())?;
            for mat in tg.materializers.iter_mut().filter(|m| m.name == "module") {
                let mut mat_data: ModuleMatData = object_from_map(std::mem::take(&mut mat.data))?;
                eprintln!("mata data: {mat_data:?}");
                let path = mat_data
                    .code
                    .strip_prefix("file:")
                    .ok_or_else(|| anyhow!("ModuleMatData::code is invalid"))
                    .context("PostProcessor for Codegen")?;
                let path = Path::new(path).to_owned();
                let code = std::fs::read_to_string(path)?;
                mat_data.code = transform_module(code)?;
                mat.data = map_from_object(mat_data)?;
            }
            Ok(())
        }
    }
}

pub mod prisma_rt {
    use super::*;
    use anyhow::{bail, Context};
    use common::{archive, typegraph::PrismaRuntimeData};
    use log::warn;

    use crate::{
        cli::prisma::PrismaArgs,
        typegraph::utils::{map_from_object, object_from_map},
    };

    #[derive(Default)]
    pub struct EmbedPrismaMigrations {
        create_migration: bool,
        allow_dirty: bool,
    }

    impl EmbedPrismaMigrations {
        pub fn allow_dirty(mut self, allow: bool) -> Self {
            self.allow_dirty = allow;
            self
        }

        pub fn create_migration(mut self, create: bool) -> Self {
            self.create_migration = create;
            self
        }
    }

    impl PostProcessor for EmbedPrismaMigrations {
        fn postprocess(&self, tg: &mut Typegraph, config: &Config) -> Result<()> {
            if !self.allow_dirty {
                let repo = git2::Repository::discover(&config.base_dir).ok();

                if let Some(repo) = repo {
                    let dirty = repo.statuses(None)?.iter().any(|s| {
                        // git2::Status::CURRENT.bits() == 0
                        // https://github.com/libgit2/libgit2/blob/2f20fe8869d7a1df7c9b7a9e2939c1a20533c6dc/include/git2/status.h#L35
                        !s.status().is_empty() && !s.status().contains(git2::Status::IGNORED)
                    });
                    if dirty {
                        bail!("Dirty repository not allowed");
                    }
                } else {
                    warn!("Not in a git repository.");
                }
            }

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
                    rt_data.migrations = Some(archive::archive(path)?);
                    rt_data.create_migration = self.create_migration;
                }
                rt.data = map_from_object(rt_data)?;
            }

            tg.runtimes = runtimes;

            Ok(())
        }
    }
}
