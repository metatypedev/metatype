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

pub use deno_rt::DenoModules;

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
