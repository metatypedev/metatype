// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::{Action, CommonArgs, GenArgs};
use crate::{
    config::Config,
    utils::{
        graphql::{self, Query},
        Node,
    },
};
use anyhow::{anyhow, bail, Context, Result};
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::{Parser, Subcommand};
use colored::Colorize;
use common::archive::{self};
use indoc::indoc;
use prisma_models::psl;
use question::{Answer, Question};

use serde::Deserialize;
use serde_json::json;
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::PathBuf;

static MIGRATION_ENDPOINT: &str = "/typegate/prisma_migration";

#[derive(Parser, Debug)]
pub struct Prisma {
    #[clap(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Updates the database using migrations during development,
    /// and creates the database if it does not exist.
    /// See: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-dev
    Dev(Dev),
    /// Apply all pending migrations.
    /// See: https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-deploy
    Deploy(Deploy),
    /// Show prisma diff: current schema on the typegate vs the database
    Diff(Diff),
    /// Reformat a prisma schema
    Format(Format),
}

#[async_trait]
impl Action for Prisma {
    async fn run(&self, args: GenArgs) -> Result<()> {
        match &self.command {
            Commands::Diff(diff) => {
                diff.run(args).await?;
            }
            Commands::Format(format) => {
                format.run(args).await?;
            }
            Commands::Dev(dev) => {
                dev.run(args).await?;
            }
            Commands::Deploy(deploy) => {
                deploy.run(args).await?;
            }
        }
        Ok(())
    }
}

#[derive(Parser, Debug, Clone)]
pub struct PrismaArgs {
    /// Name of the typegraph.
    #[clap(value_parser)]
    pub typegraph: String,

    /// Name of the prisma runtime.
    /// Default: the unique prisma runtime of the typegraph.
    #[clap(long)]
    pub runtime: Option<String>,

    /// Path to the migrations directory.
    #[clap(long)]
    pub migrations: Option<PathBuf>,
}

impl PrismaArgs {
    pub fn fill(&self, config: &Config) -> Result<Option<PrismaArgsFull>> {
        let prisma_config = &config.typegraphs.materializers.prisma;
        let migpath = prisma_config.base_migrations_path(self, config);
        let runtime_name = utils::find_runtime_name(&migpath).context("Finding runtime name")?;

        runtime_name
            .map(|rt_name| -> Result<_> {
                let migrations = archive::archive(migpath.join(&rt_name))?;
                Ok(PrismaArgsFull {
                    typegraph: self.typegraph.clone(),
                    runtime: rt_name,
                    migrations,
                })
            })
            .transpose()
    }
}

pub struct PrismaArgsFull {
    pub typegraph: String,
    pub runtime: String,
    pub migrations: String,
}

#[derive(Parser, Debug)]
pub struct Dev {
    #[command(flatten)]
    node: super::CommonArgs,

    #[command(flatten)]
    prisma: PrismaArgs,

    /// Creates a migration based on the changes but does not apply that migration.
    #[clap(long)]
    create_only: bool,
}

#[async_trait]
impl Action for Dev {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;
        let config_path = args.config;
        let config = Config::load_or_find(config_path, dir)?;

        let node_config = config.node("dev").with_args(&self.node);
        let node = node_config.build(dir).await?;

        let mut migrate = PrismaMigrate::new(&self.prisma, &config, node)?;

        migrate.apply(false).await?;
        println!();

        let (rt_name, changes) = migrate.diff(false).await?;

        migrate.runtime_name.replace(rt_name);

        if changes {
            println!("A migration will be created and applied for the changes.");
            let ans = Question::new("Name of the migration to create (an empty string to skip):")
                .ask()
                .unwrap();
            if let Answer::RESPONSE(name) = ans {
                if !name.is_empty() {
                    migrate.create(name, !self.create_only).await?;
                    migrate.end()?;
                }
            }
        }

        Ok(())
    }
}

#[derive(Parser, Debug)]
pub struct Deploy {
    #[command(flatten)]
    node: CommonArgs,

    #[command(flatten)]
    prisma: PrismaArgs,
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;
        let config_path = args.config;
        let config = Config::load_or_find(config_path, dir)?;
        let prisma_args = self
            .prisma
            .fill(&config)?
            .ok_or_else(|| anyhow!("No migrations in the migration directory"))?;

        let node_config = config.node("deploy");

        let node: Node = node_config.build(dir).await?;

        let res = node
            .post(MIGRATION_ENDPOINT)?
            .gql(
                indoc! {"
                    mutation PrismaDeploy($tg: String!, $runtime: String!, $mig: String!) {
                        deploy(typegraph: $tg, runtime: $runtime, migrations: $mig) {
                            migrationCount
                            appliedMigrations
                        }
                    }
                "}
                .to_string(),
                Some(json!({
                    "tg": &self.prisma.typegraph,
                    "runtime": prisma_args.runtime,
                    "mig": prisma_args.migrations,
                })),
            )
            .await?;

        #[derive(serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct PrismaDeployResult {
            // TODO runtime_name: String, // for printing relative path...
            migration_count: usize,
            applied_migrations: Vec<String>,
        }
        let result: PrismaDeployResult = res.data("deploy")?;

        if result.migration_count == 0 {
            println!("No migration found.")
        } else {
            println!(
                "{len} migration{s} found.",
                len = result.migration_count,
                s = if result.migration_count > 1 { "s" } else { "" }
            )
        }

        if result.applied_migrations.is_empty() {
            println!("No pending migrations to apply.")
        } else {
            let plural = result.applied_migrations.len() > 1;
            println!(
                "The following migration{s} {have} been applied:",
                s = if plural { "s" } else { "" },
                have = if plural { "have" } else { "has" }
            );
            for mig in result.applied_migrations {
                println!("{}", format!(" - {mig}").blue())
            }
        }

        Ok(())
    }
}

#[derive(Parser, Debug)]
pub struct Diff {
    #[command(flatten)]
    node: CommonArgs,

    #[command(flatten)]
    prisma: PrismaArgs,

    /// Output a SQL script instead of the default human-readable summary
    #[clap(long)]
    script: bool,
}

#[async_trait]
impl Action for Diff {
    async fn run(&self, args: GenArgs) -> Result<()> {
        let dir = &args.dir()?;
        let config_path = args.config;
        let config = Config::load_or_find(config_path, dir)?;
        let node_config = config.node("dev").with_args(&self.node);
        let node = node_config.build(dir).await?;
        PrismaMigrate::new(&self.prisma, &config, node)?
            .diff(self.script)
            .await?;
        Ok(())
    }
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

#[async_trait]
impl Action for Format {
    async fn run(&self, _args: GenArgs) -> Result<()> {
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

        let output = psl::reformat(&input, 2).unwrap();

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

pub struct PrismaMigrate {
    typegraph: String,
    runtime_name: Option<String>,
    migrations: Option<String>,
    base_migration_path: PathBuf,
    node: Node,
}

impl PrismaMigrate {
    fn new(args: &PrismaArgs, config: &Config, node: Node) -> Result<Self> {
        let prisma_config = &config.typegraphs.materializers.prisma;
        let base_migpath = prisma_config.base_migrations_path(args, config);
        let runtime_name =
            utils::find_runtime_name(&base_migpath).context("Finding runtime name")?;
        let migrations = runtime_name
            .as_ref()
            .map(|rt_name| archive::archive(base_migpath.join(rt_name)))
            .transpose()
            .context("Archiving migrations")?;

        Ok(Self {
            typegraph: args.typegraph.clone(),
            runtime_name,
            node,
            migrations,
            base_migration_path: base_migpath,
        })
    }

    fn end(self) -> Result<()> {
        let migrations_path = self.base_migration_path.join(
            self.runtime_name
                .expect("runtime name should have been set"), // runtime_name should have been set
        );

        self.migrations
            .as_ref()
            .expect("migrations should have been updated"); // migrations should have been set

        common::archive::unpack(migrations_path, self.migrations)?;
        Ok(())
    }

    /// Apply pending migrations
    #[async_recursion]
    async fn apply(&self, reset_database: bool) -> Result<()> {
        enum ApplyResponse {
            Ok(graphql::Response),
            ResetRequired(String),
        }

        let res = self
            .node
            .post(MIGRATION_ENDPOINT)?
            .gql(
                indoc! {"
                mutation PrismaApply($tg: String!, $rt: String, $mig: String, $reset: Boolean!) {
                    apply(typegraph: $tg, runtime: $rt, migrations: $mig, resetDatabase: $reset) {
                        databaseReset
                        appliedMigrations
                    }
                }
            "}
                .to_string(),
                Some(json!({
                    "tg": self.typegraph,
                    "rt": self.runtime_name,
                    "mig": self.migrations,
                    "reset": reset_database,
                })),
            )
            .await
            .map_or_else(
                |e| {
                    if let graphql::Error::FailedQuery(errors) = &e {
                        let err = errors
                            .iter()
                            .find(|e| e.message.starts_with("database reset required: "));

                        if let Some(err) = err {
                            let idx = err.message.find(": ").unwrap();
                            let (_, reason) = err.message.split_at(idx + 2);
                            return Ok(ApplyResponse::ResetRequired(reason.to_owned()));
                        }
                    }
                    Err(e)
                },
                |r| Ok(ApplyResponse::Ok(r)),
            )?;

        match res {
            ApplyResponse::ResetRequired(reason) => {
                println!("Database reset required:");
                println!("{}", reason.dimmed());

                let ans = Question::new("Do you want to reset the database?").confirm();
                match ans {
                    Answer::YES => {
                        self.apply(true).await?;
                    }
                    _ => {
                        bail!("Operation aborted.");
                    }
                }
            }

            ApplyResponse::Ok(res) => {
                #[derive(serde::Deserialize)]
                #[serde(rename_all = "camelCase")]
                struct Res {
                    database_reset: bool,
                    applied_migrations: Vec<String>,
                }

                let res: Res = res.data("apply")?;
                if res.database_reset {
                    println!("Database has been reset.");
                }

                if res.applied_migrations.is_empty() {
                    println!("{}", "No pending migrations to apply.".dimmed());
                } else {
                    let plural = res.applied_migrations.len() > 1;
                    println!(
                        "The following migration{s} {have} been applied:",
                        s = if plural { "s" } else { "" },
                        have = if plural { "have" } else { "has" }
                    );
                    for mig in res.applied_migrations {
                        println!("{}", format!(" - {mig}").blue())
                    }
                }
            }
        }

        Ok(())
    }

    /// Create and eventually apply a new migration
    async fn create(&mut self, name: String, apply: bool) -> Result<()> {
        let res = self.node.post(MIGRATION_ENDPOINT)?.gql(
            indoc! {"
                    mutation PrismaCreate($tg: String!, $rt: String, $mig: String, $name: String!, $apply: Boolean!) {
                        create(typegraph: $tg, runtime: $rt, migrations: $mig, name: $name, apply: $apply) {
                            createdMigrationName
                            appliedMigrations
                            migrations
                            runtimeName
                        }
                    }
                "}
            .to_string(),
            Some(json!({
                "tg": self.typegraph,
                "rt": self.runtime_name,
                "mig": self.migrations,
                "name": name,
                "apply": apply
            })),
        ).await?;

        res.display_errors();

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Res {
            created_migration_name: String,
            applied_migrations: Vec<String>,
            migrations: String,
            runtime_name: String,
        }
        let res: Res = res.data("create")?;

        let applied = if let Some((last, others)) = res.applied_migrations.split_last() {
            if last != &res.created_migration_name {
                bail!("The new migration was not the latest applied migration");
            }
            others
        } else {
            &res.applied_migrations
        };

        if !applied.is_empty() {
            let plural = applied.len() > 1;
            println!(
                "The following migration{s} {have} been applied:",
                s = if plural { "s" } else { "" },
                have = if plural { "have" } else { "has" }
            );
            for mig in applied {
                println!("{}", format!("- {mig}").blue())
            }
        }

        println!();
        println!(
            "The following migration has been created{}:",
            if apply { " and applied" } else { "" }
        );
        println!(
            "{}",
            format!(" - {mig}", mig = res.created_migration_name).green()
        );

        self.runtime_name.replace(res.runtime_name);
        self.migrations.replace(res.migrations);

        Ok(())
    }

    pub async fn diff(&self, script: bool) -> Result<(String, bool)> {
        let res = self
            .node
            .post(MIGRATION_ENDPOINT)?
            .gql(
                indoc! {"
                    query PrismaDiff($tg: String!, $rt: String, $script: Boolean) {
                        diff(typegraph: $tg, runtime: $rt, script: $script) {
                            diff
                            runtimeName
                        }
                    }
                "}
                .to_string(),
                Some(json!({
                    "tg": self.typegraph,
                    "rt": self.runtime_name,
                    "script": script,
                })),
            )
            .await?;

        res.display_errors();

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Res {
            diff: Option<String>,
            runtime_name: String,
        }

        let res: Res = res.data("diff")?;

        println!("Diff for runtime '{}'", res.runtime_name);

        if let Some(diff) = res.diff.as_ref() {
            println!("{}", diff.blue());
            Ok((res.runtime_name, true))
        } else {
            println!("{}", "No changes.".dimmed());
            Ok((res.runtime_name, false))
        }
    }

    #[allow(dead_code)]
    pub async fn reset(node: &Node, tg: &String, rt: Option<&str>) -> Result<()> {
        let res = node
            .post(MIGRATION_ENDPOINT)?
            .gql(
                indoc! {"
                    query PrismaReset($tg: String!, $rt: String) {
                        reset(typegraph: $tg, runtime: $rt)
                    }
                "}
                .to_string(),
                Some(json!({
                    "tg": tg,
                    "rt": rt,
                })),
            )
            .await?;

        res.display_errors();

        let res: bool = res.data("reset")?;

        if res {
            println!("Database has been reset successfully!");
        } else {
            eprintln!("Some error occured");
        }

        Ok(())
    }
}

mod utils {
    use anyhow::{bail, Result};
    use std::{
        fs,
        path::{Path, PathBuf},
    };

    pub fn find_runtime_name(base_migrations_dir: impl AsRef<Path>) -> Result<Option<String>> {
        if !base_migrations_dir.as_ref().try_exists()? {
            return Ok(None);
        }
        let subdirs = fs::read_dir(base_migrations_dir.as_ref())?
            .filter_map(|entry| -> Option<PathBuf> { entry.ok().map(|e| e.path()) })
            .filter(|p| p.is_dir())
            .collect::<Vec<_>>();

        match subdirs.len() {
            0 => Ok(None),
            1 => Ok(subdirs.into_iter().next().map(|p| p.file_name().unwrap().to_str().unwrap().to_owned())),
            _ => bail!("Runtime name required: more than one runtimes are defined in the migration directory"),
        }
    }
}
