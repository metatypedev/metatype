use super::{dev::collect_typegraphs, Action};
use crate::prisma::migration;
use crate::typegraph::Typegraph;
use anyhow::Result;
use clap::{Parser, Subcommand};
use tokio::runtime::Runtime;

#[derive(Parser, Debug)]
pub struct Prisma {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Adds files to myapp
    Apply(Apply),
    /// Adds files to myapp
    Diff(Diff),
}

#[derive(Parser, Debug)]
pub struct Apply {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,
}

#[derive(Parser, Debug)]
pub struct Diff {
    /// Name of the person to greet
    #[clap(short, long, value_parser)]
    file: Option<String>,
}

impl Action for Apply {
    fn run(&self, dir: String) -> Result<()> {
        let runtime = Runtime::new()?;

        let loader = match &self.file {
            Some(file) => format!(r#"loaders.import_file("{}")"#, file),
            None => r#"loaders.import_folder(".")"#.to_string(),
        };
        let tgs = collect_typegraphs(dir, Some(loader), false)?;

        for tg in tgs {
            let typegraph: Typegraph = serde_json::from_str(&tg.1)?;

            for rt in typegraph.runtimes {
                if rt.name == "prisma" {
                    let fut = migration::push(
                        rt.data
                            .get("datasource")
                            .unwrap()
                            .as_str()
                            .unwrap()
                            .to_string(),
                        rt.data
                            .get("datamodel")
                            .unwrap()
                            .as_str()
                            .unwrap()
                            .to_string(),
                    );
                    match runtime.block_on(fut) {
                        Ok(result) => println!("{:?}", result),
                        Err(error) => println!("error: {}", error),
                    };
                }
            }
        }

        Ok(())
    }
}

impl Action for Diff {
    fn run(&self, dir: String) -> Result<()> {
        let runtime = Runtime::new()?;

        let loader = match &self.file {
            Some(file) => format!(r#"loaders.import_file("{}")"#, file),
            None => r#"loaders.import_folder(".")"#.to_string(),
        };
        let tgs = collect_typegraphs(dir, Some(loader), false)?;

        for tg in tgs {
            let typegraph: Typegraph = serde_json::from_str(&tg.1)?;

            for rt in typegraph.runtimes {
                if rt.name == "prisma" {
                    let fut = migration::diff(
                        rt.data
                            .get("datasource")
                            .unwrap()
                            .as_str()
                            .unwrap()
                            .to_string(),
                        rt.data
                            .get("datamodel")
                            .unwrap()
                            .as_str()
                            .unwrap()
                            .to_string(),
                    );
                    match runtime.block_on(fut) {
                        Ok(_exit_code) => "success".to_string(),
                        Err(error) => format!("error: {}", error),
                    };
                }
            }
        }

        Ok(())
    }
}
