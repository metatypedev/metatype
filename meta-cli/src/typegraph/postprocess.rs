// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::sync::{Arc, RwLock};

use crate::config::Config;

use super::utils::{map_from_object, object_from_map};
use anyhow::Context;
use anyhow::{bail, Result};
use colored::Colorize;
use common::archive::archive_entries;
use common::typegraph::validator::validate_typegraph;
use common::typegraph::{Materializer, Typegraph};
use ignore::WalkBuilder;
use log::error;
use std::path::Path;
use typescript::parser::transform_script;

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

fn compress_and_encode(main_path: &Path, tg_path: &Path) -> Result<String> {
    // Note: tg_path and main_path are all absolute
    // tg_root/tg.py
    // tg_root/* <= script location
    if main_path.is_relative() {
        bail!(
            "script path {:?} is relative, absolute expected",
            main_path.display()
        );
    }

    if tg_path.is_relative() {
        bail!(
            "typegraph path {:?} is relative, absolute expected",
            tg_path.display()
        );
    }

    let tg_root = tg_path.parent().with_context(|| {
        format!(
            "invalid state: typegraph path {:?} does not have parent",
            tg_path.display()
        )
    })?;

    let dir_walker = WalkBuilder::new(tg_root)
        .standard_filters(true)
        // .add_custom_ignore_filename(".DStore")
        .sort_by_file_path(|a, b| a.cmp(b))
        .build();

    let enc_content = match archive_entries(dir_walker, Some(tg_root)).unwrap() {
        Some(b64) => b64,
        None => "".to_string(),
    };

    let file = match main_path.strip_prefix(tg_root) {
        Ok(ret) => ret,
        Err(_) => bail!(
            "{:?} does not contain script {:?}",
            tg_root.display(),
            main_path.display(),
        ),
    };

    Ok(format!("file:{};base64:{}", file.display(), enc_content))
}

pub use deno_rt::DenoModules;
pub use deno_rt::ReformatScripts;
pub use prisma_rt::EmbedPrismaMigrations;
pub use prisma_rt::EmbeddedPrismaMigrationOptionsPatch;
pub use python_rt::PythonModules;

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
    use std::fs;

    use common::typegraph::runtimes::{FunctionMatData, ModuleMatData};

    use crate::typegraph::utils::{get_materializers, get_runtimes};

    use super::*;

    pub struct ReformatScripts;

    impl From<ReformatScripts> for PostProcessorWrapper {
        fn from(_val: ReformatScripts) -> Self {
            PostProcessorWrapper::generic(reformat_scripts)
        }
    }

    fn reformat_materializer_script(mat: &mut Materializer) -> Result<()> {
        if mat.name.as_str() == "function" {
            let mut mat_data: FunctionMatData = object_from_map(std::mem::take(&mut mat.data))?;
            // TODO check variable `_my_lambda` exists and is a function expression/lambda
            mat_data.script = transform_script(mat_data.script)?;
            mat.data = map_from_object(mat_data)?;
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

    #[derive(Default, Debug)]
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

                // make sure tg_path is absolute
                let tg_path = fs::canonicalize(tg.path.to_owned().unwrap()).unwrap();
                let main_path = tg_path.parent().unwrap().join(path);
                mat_data.code = compress_and_encode(&main_path, &tg_path)?;

                mat.data = map_from_object(mat_data)?;
                tg.deps.push(main_path);
            }
            Ok(())
        }
    }
}

pub mod python_rt {
    use super::*;
    use common::typegraph::runtimes::ModuleMatData;
    use std::fs;

    #[derive(Default, Debug)]
    pub struct PythonModules {}

    impl PostProcessor for PythonModules {
        fn postprocess(&self, tg: &mut Typegraph, _config: &Config) -> Result<()> {
            for mat in tg.materializers.iter_mut().filter(|m| m.name == "pymodule") {
                let mut mat_data: ModuleMatData = object_from_map(std::mem::take(&mut mat.data))?;
                let path = mat_data
                    .code
                    .strip_prefix("file:")
                    .context("\"file:\" prefix is not present")?;

                // make sure tg_path is absolute
                let tg_path = fs::canonicalize(tg.path.to_owned().unwrap()).unwrap();
                let main_path = tg_path.parent().unwrap().join(path);
                mat_data.code = compress_and_encode(&main_path, &tg_path)?;

                mat.data = map_from_object(mat_data)?;
                tg.deps.push(main_path);
            }
            Ok(())
        }
    }
}

pub mod prisma_rt {
    use super::*;
    use anyhow::{anyhow, Context};
    use common::{
        archive,
        typegraph::runtimes::{MigrationOptions, PrismaRuntimeData},
    };

    use crate::typegraph::utils::{map_from_object, object_from_map};

    #[derive(Default, Debug)]
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

    impl PostProcessor for EmbedPrismaMigrations {
        fn postprocess(&self, tg: &mut Typegraph, config: &Config) -> Result<()> {
            let tg_name = tg.name().context("Getting typegraph name")?;
            let base_migration_path = config.prisma_migrations_dir(&tg_name);

            let mut runtimes = std::mem::take(&mut tg.runtimes);
            for rt in runtimes.iter_mut().filter(|rt| rt.name == "prisma") {
                let mut rt_data: PrismaRuntimeData = object_from_map(std::mem::take(&mut rt.data))?;
                let rt_name = &rt_data.name;
                let path = base_migration_path.join(rt_name);
                rt_data.migration_options = Some(MigrationOptions {
                    migration_files: archive::archive(path)?,
                    create: self.create_migration,
                    reset: self.reset_on_drift,
                });
                rt.data = map_from_object(rt_data)?;
            }

            tg.runtimes = runtimes;

            Ok(())
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
            let mut runtimes = std::mem::take(&mut tg.runtimes);
            for rt in runtimes.iter_mut().filter(|rt| rt.name == "prisma") {
                let mut rt_data: PrismaRuntimeData = object_from_map(std::mem::take(&mut rt.data))?;
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
                rt.data = map_from_object(rt_data)?;
            }

            tg.runtimes = runtimes;

            Ok(())
        }
    }
}
