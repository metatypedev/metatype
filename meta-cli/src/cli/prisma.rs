use std::fs::File;
use std::io::{self, Read, Write};

use super::Action;
use crate::prisma::migration;
use crate::typegraph::TypegraphLoader;
use crate::utils::ensure_venv;
use anyhow::{Context, Result};
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
    /// Reformat a prisma schema
    Format(Format),
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

#[derive(Parser, Debug)]
pub struct Format {
    /// Input file, default: stdin
    #[clap(value_parser)]
    input: Option<String>,
    /// Output file, default: stdout
    #[clap(short, value_parser)]
    output: Option<String>,
}

impl Action for Apply {
    fn run(&self, dir: String) -> Result<()> {
        ensure_venv(&dir)?;
        let runtime = Runtime::new()?;

        let loader = TypegraphLoader::new();
        let tgs = match &self.file {
            Some(file) => loader.load_file(file)?,
            None => loader.load_folder(&dir)?,
        };

        for (_name, typegraph) in tgs {
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
        ensure_venv(&dir)?;
        let runtime = Runtime::new()?;

        let loader = TypegraphLoader::new();
        let tgs = match &self.file {
            Some(file) => loader.load_file(file)?,
            None => loader.load_folder(&dir)?,
        };

        for (_name, typegraph) in tgs {
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

impl Action for Format {
    fn run(&self, _dir: String) -> Result<()> {
        let input = if let Some(file) = self.input.as_ref() {
            let mut file =
                File::open(file).with_context(|| format!("could not open file \"{file}\""))?;
            let mut buf = String::new();
            file.read_to_string(&mut buf)
                .context("could not read from input file")?;
            buf
        } else {
            let mut buf = String::new();
            io::stdin()
                .read_to_string(&mut buf)
                .expect("could not read input from stdin");
            buf
        };

        let output = datamodel::reformat(&input, 2).unwrap();

        if let Some(file) = self.output.as_ref() {
            let mut file = File::create(file)
                .with_context(|| format!(r#"could not open output file "{file}""#))?;
            file.write_all(output.as_bytes())
                .context("could not write into file")?;
            file.flush()?;
        } else {
            let mut out = io::stdout();
            out.write_all(output.as_bytes())
                .context("could not write formatted schema into stdout")?;
            out.flush()?;
        }

        Ok(())
    }
}
