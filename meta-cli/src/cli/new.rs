// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::path::PathBuf;

use super::{Action, GenArgs};
use anyhow::{bail, Ok, Result};
use async_trait::async_trait;
use clap::{Parser, ValueEnum};
use include_dir::{include_dir, Dir};

static TEMPLATES: Dir = include_dir!("examples/templates");

#[derive(ValueEnum, Debug, Clone)]
#[clap(rename_all = "kebab_case")]
enum Template {
    Python,
    Deno,
    Node,
}

impl Template {
    fn name(&self) -> &'static str {
        match self {
            Template::Python => "python",
            Template::Deno => "deno",
            Template::Node => "node",
        }
    }
}

#[derive(Parser, Debug)]

pub struct New {
    // Target directory
    #[clap(default_value = ".")]
    dir: String,

    /// Templates to use
    #[clap(long, value_enum)]
    template: Template,
}

#[async_trait]
impl Action for New {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = PathBuf::from(&self.dir);
        let target_dir = if dir.is_absolute() {
            dir
        } else {
            args.dir()?.join(&dir)
        };
        println!("Target directory {}", target_dir.display());

        let template_name = self.template.name();
        match TEMPLATES.get_dir(template_name) {
            Some(template) => {
                if !target_dir.exists() {
                    println!("Creating directory: {}", target_dir.display());
                    std::fs::create_dir(&target_dir)?;
                } else if target_dir.is_file() {
                    bail!("target directory is a file: {}", target_dir.display());
                }

                unpack_template(target_dir.clone(), template, template_name, true)?;
                unpack_template(target_dir, template, template_name, false)?;
                Ok(())
            }
            None => bail!("template not found: {}", template_name),
        }
    }
}

fn unpack_template(
    base: PathBuf,
    template_dir: &Dir,
    strip_prefix: &str,
    dry_mode: bool,
) -> Result<()> {
    for file in template_dir.files() {
        let rel_path = file.path().strip_prefix(strip_prefix)?;
        let path = base.join(rel_path);
        if path.exists() {
            bail!("{} already exists", rel_path.display());
        }
        if !dry_mode {
            println!("Unpacked {}", path.display());
            std::fs::write(path, file.contents())?;
        }
    }

    for dir in template_dir.dirs() {
        let rel_path = dir.path().strip_prefix(strip_prefix)?;
        let path = base.join(rel_path);
        if path.exists() {
            bail!("{} already exists", rel_path.display());
        }
        if !dry_mode {
            std::fs::create_dir(path.clone())?;
        }
        unpack_template(base.clone(), dir, strip_prefix, dry_mode)?;
    }

    Ok(())
}
