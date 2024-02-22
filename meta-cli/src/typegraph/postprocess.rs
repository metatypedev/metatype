// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::{Arc, RwLock};

use crate::config::Config;

use anyhow::{bail, Result};
use colored::Colorize;
use common::typegraph::validator::validate_typegraph;
use common::typegraph::Typegraph;
use log::error;

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
pub use prisma_rt::EmbedPrismaMigrations;
pub use prisma_rt::EmbeddedPrismaMigrationOptionsPatch;

pub struct Validator;
impl PostProcessor for Validator {
    fn postprocess(&self, tg: &mut Typegraph, _config: &Config) -> Result<()> {
        let errors = validate_typegraph(tg);
        let tg_name = tg.name()?.cyan();
        if !errors.is_empty() {
            for err in errors.iter() {
                error!(
                    "at {tg_name}:{err_path}: {msg}",
                    err_path = err.path,
                    msg = err.message
                );
            }
            bail!("Typegraph {tg_name} failed validation");
        } else {
            Ok(())
        }
    }
}

pub mod deno_rt {
    use super::*;

    #[derive(Default, Debug, Clone)]
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
            Ok(())
        }
    }
}

pub mod prisma_rt {
    use super::*;
    use anyhow::anyhow;
    use common::typegraph::runtimes::{KnownRuntime::Prisma, TGRuntime};

    #[derive(Default, Debug, Clone)]
    pub struct EmbedPrismaMigrations {
        create_migration: bool,
        reset_on_drift: bool,
    }

    impl EmbedPrismaMigrations {
        pub fn create_migration(mut self, create: bool) -> Self {
            self.create_migration = create;
            self
        }

        pub fn reset_on_drift(mut self, reset: bool) -> Self {
            self.reset_on_drift = reset;
            self
        }
    }

    #[derive(Default)]
    pub struct EmbeddedPrismaMigrationOptionsPatch {
        reset: Option<bool>,
    }

    impl EmbeddedPrismaMigrationOptionsPatch {
        pub fn reset_on_drift(mut self, reset: bool) -> Self {
            self.reset = Some(reset);
            self
        }

        pub fn apply(&self, tg: &mut Typegraph, runtime_names: Vec<String>) -> Result<()> {
            for rt in tg.runtimes.iter_mut() {
                if let TGRuntime::Known(Prisma(rt_data)) = rt {
                    let rt_name = &rt_data.name;
                    if runtime_names.contains(rt_name) {
                        let migration_options =
                            rt_data.migration_options.as_mut().ok_or_else(|| {
                                anyhow!("Runtime '{rt_name}' not configured to include migrations")
                            })?;
                        if let Some(reset_on_drift) = self.reset {
                            migration_options.reset = reset_on_drift;
                        }
                    }
                }
            }

            Ok(())
        }
    }
}
