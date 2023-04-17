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

pub use deno_rt::DenoModules;
pub use deno_rt::ReformatScripts;
pub use prisma_rt::EmbedPrismaMigrations;
pub use prisma_rt::EmbeddedPrismaMigrationsPatch;

pub mod deno_rt {
    use std::path::Path;

    use crate::typegraph::utils::{get_materializers, get_runtimes};

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

    #[derive(Default)]
    pub struct DenoModules {
        codegen: bool,
    }

    impl DenoModules {
        pub fn codegen(mut self, codegen: bool) -> Self {
            self.codegen = codegen;
            self
        }
    }

    impl PostProcessor for DenoModules {
        fn postprocess(&self, tg: &mut Typegraph, _config: &Config) -> Result<()> {
            if self.codegen {
                crate::codegen::deno::codegen(tg, tg.path.as_ref().unwrap())?;
            }
            for mat in tg.materializers.iter_mut().filter(|m| m.name == "module") {
                let mut mat_data: ModuleMatData = object_from_map(std::mem::take(&mut mat.data))?;
                let Some(path) = mat_data.code.strip_prefix("file:") else {
                    continue;
                };

                let path = Path::new(path).to_owned();
                let code = std::fs::read_to_string(&path)?;
                mat_data.code = transform_module(code)?;
                mat.data = map_from_object(mat_data)?;
                tg.deps.push(path);
            }
            Ok(())
        }
    }
}

pub mod prisma_rt {
    use super::*;
    use anyhow::{anyhow, bail, Context};
    use common::{archive, typegraph::PrismaRuntimeData};
    use log::warn;

    use crate::{
        cli::prisma::PrismaArgs,
        typegraph::utils::{map_from_object, object_from_map},
    };

    #[derive(Default)]
    pub struct EmbedPrismaMigrations {
        create_migration: bool,
        reset_on_drift: bool,
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

        pub fn reset_on_drift(mut self, reset: bool) -> Self {
            self.reset_on_drift = reset;
            self
        }
    }

    impl PostProcessor for EmbedPrismaMigrations {
        fn postprocess(&self, tg: &mut Typegraph, config: &Config) -> Result<()> {
            let error = if !self.allow_dirty {
                let repo = git2::Repository::discover(&config.base_dir).ok();

                if let Some(repo) = repo {
                    let dirty = repo.statuses(None)?.iter().any(|s| {
                        // git2::Status::CURRENT.bits() == 0
                        // https://github.com/libgit2/libgit2/blob/2f20fe8869d7a1df7c9b7a9e2939c1a20533c6dc/include/git2/status.h#L35
                        !s.status().is_empty() && !s.status().contains(git2::Status::IGNORED)
                    });
                    if dirty {
                        // TODO only check migration directory for the current typegraph
                        Some(anyhow!("Dirty repository not allowed"))
                    } else {
                        None
                    }
                } else {
                    warn!("Not in a git repository.");
                    None
                }
            } else {
                None
            };

            let prisma_config = &config.typegraphs.materializers.prisma;
            let tg_name = tg.name().context("Getting typegraph name")?;

            let mut runtimes = std::mem::take(&mut tg.runtimes);
            for rt in runtimes.iter_mut().filter(|rt| rt.name == "prisma") {
                if let Some(error) = error {
                    bail!(error);
                }
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
                    rt_data.migrations = archive::archive(path)?;
                    rt_data.create_migration = self.create_migration;
                    rt_data.reset_on_drift = self.reset_on_drift;
                }
                rt.data = map_from_object(rt_data)?;
            }

            tg.runtimes = runtimes;

            Ok(())
        }
    }

    #[derive(Default)]
    pub struct EmbeddedPrismaMigrationsPatch {
        reset_on_drift: Option<bool>,
    }

    impl EmbeddedPrismaMigrationsPatch {
        pub fn reset_on_drift(mut self, reset: bool) -> Self {
            self.reset_on_drift = Some(reset);
            self
        }

        pub fn apply(&self, tg: &mut Typegraph, runtime_names: Vec<String>) -> Result<()> {
            let mut runtimes = std::mem::take(&mut tg.runtimes);
            for rt in runtimes.iter_mut().filter(|rt| rt.name == "prisma") {
                let mut rt_data: PrismaRuntimeData = object_from_map(std::mem::take(&mut rt.data))?;
                let rt_name = &rt_data.name;
                if runtime_names.contains(rt_name) {
                    if let Some(reset_on_drift) = self.reset_on_drift {
                        rt_data.reset_on_drift = reset_on_drift;
                    }
                }
                rt.data = map_from_object(rt_data)?;
            }

            tg.runtimes = runtimes;

            Ok(())
        }
    }
}
