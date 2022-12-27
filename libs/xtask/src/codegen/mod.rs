// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

mod jsonschema;

use anyhow::Result;
use clap::Parser;

#[derive(Parser, Debug)]
pub struct Codegen {
    modules: Vec<String>,
}

type CodegenEntry = (&'static str, fn() -> Result<()>);

const CODEGEN_ENTRIES: &[CodegenEntry] = &[("jsonschema", jsonschema::run)];

impl Codegen {
    pub fn run(&self) -> Result<()> {
        let run_all = self.modules.is_empty();
        for (n, f) in CODEGEN_ENTRIES
            .iter()
            .filter(|(n, _)| run_all || self.modules.iter().any(|name| n == name))
        {
            println!("Codegen: {n}");
            f()?;
            println!();
        }
        Ok(())
    }
}
