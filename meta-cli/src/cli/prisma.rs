// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use super::Action;
use crate::{
    config::Config,
    utils::{
        clap::UrlValueParser,
        graphql::{self, Query},
        BasicAuth, Node,
    },
};
use anyhow::{bail, Context, Result};
use async_recursion::async_recursion;
use async_trait::async_trait;
use clap::{Parser, Subcommand};
use colored::Colorize;
use common::archive::archive;
use indoc::indoc;
use prisma_models::psl;
use question::{Answer, Question};
use reqwest::Url;
use serde::Deserialize;
use serde_json::json;
use std::io::{self, Read, Write};
use std::path::PathBuf;
use std::{
    fs::{self, File},
    path::Path,
};

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

#[derive(Parser, Debug)]
pub struct Dev {
    /// Name of the typegraph.
    #[clap(value_parser)]
    typegraph: String,

    /// Name of the prisma runtime.
    /// Default: the unique prisma runtime of the typegraph.
    #[clap(long)]
    runtime: Option<String>,

    /// Creates a migration based on the changes but does not apply that migration.
    #[clap(long)]
    create_only: bool,

    /// Address of the typegate.
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    gate: Option<Url>,

    #[clap(short = 'U', long, value_parser)]
    username: Option<String>,
}

#[async_trait]
impl Action for Dev {
    async fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        let config = Config::load_or_find(config_path, dir)?;

        let node_config = config.node("dev");
        let node_url = node_config.url(self.gate.clone());
        let auth = node_config.basic_auth(self.username.clone(), None).await?;

        let prisma_config = &config.typegraphs.materializers.prisma;

        let mut migrate = PrismaMigrate::new(
            self.typegraph.clone(),
            self.runtime.clone(),
            Node::new(node_url, Some(auth))?,
            prisma_config.migrations_path(),
        )?;

        migrate.apply(false).await?;
        println!();

        let (rt_name, changes) = PrismaMigrate::diff(
            false,
            &migrate.node,
            &migrate.typegraph,
            migrate.runtime_name.as_deref(),
        )
        .await?;

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
    /// Name of the typegraph.
    #[clap(value_parser)]
    typegraph: String,

    /// Name of the prisma runtime.
    #[clap(long)]
    runtime: String,

    /// Migration folder base.
    #[clap(long)]
    migrations: Option<String>,

    /// Address of the typegate.
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    gate: Option<Url>,

    #[clap(short = 'U', long)]
    username: Option<String>,
}

#[async_trait]
impl Action for Deploy {
    async fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        let config = Config::load_or_find(config_path, dir)?;
        let prisma_config = &config.typegraphs.materializers.prisma;
        let migrations = self
            .migrations
            .as_ref()
            .map(|m| Path::new(m).to_owned())
            .unwrap_or_else(|| prisma_config.migrations_path());
        let migrations_path = config
            .base_dir
            .join(migrations)
            .join(&self.typegraph)
            .join(&self.runtime);

        let migrations = archive(migrations_path.as_path())?;

        let node_config = config.node("deploy");
        let node_url = node_config.url(self.gate.clone());
        let auth = node_config.basic_auth(self.username.clone(), None).await?;
        let node = Node::new(node_url, Some(auth))?;

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
                    "tg": &self.typegraph,
                    "runtime": self.runtime,
                    "mig": migrations,
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
    /// Name of the typegraph
    #[clap(value_parser)]
    typegraph: String,

    /// Output a SQL script instead of the default human-readable summary
    #[clap(long)]
    script: bool,

    /// Address of the typegate
    #[clap(short, long, value_parser = UrlValueParser::new().http())]
    gate: Option<Url>,

    /// Name of the prisma runtime.
    /// Default: the unique prisma runtime of the typegraph.
    #[clap(long)]
    runtime: Option<String>,
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
impl Action for Diff {
    async fn run(&self, dir: String, config_path: Option<PathBuf>) -> Result<()> {
        // TODO runtime selection
        let config = Config::load_or_find(config_path, dir)?;
        let node_config = config.node("dev");
        let gate = node_config.url(self.gate.clone());
        let node = Node::new(gate, Some(BasicAuth::prompt()?))?;
        PrismaMigrate::diff(self.script, &node, &self.typegraph, self.runtime.as_deref()).await?;
        Ok(())
    }
}

#[async_trait]
impl Action for Format {
    async fn run(&self, _dir: String, _config_path: Option<PathBuf>) -> Result<()> {
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
    fn get_migrations_path<P: AsRef<Path>>(
        base_path: P,
        typegraph: &str,
        runtime: Option<&str>,
    ) -> Result<Option<PathBuf>> {
        let tg_migrations_path = base_path.as_ref().join(typegraph);
        let Ok(true) = tg_migrations_path.try_exists() else {
            fs::create_dir_all(tg_migrations_path.clone()).with_context(
                || format!("Creating migrations directory at {tg_migrations_path:?}")
            )?;
            return Ok(None);
        };
        if let Some(runtime_name) = runtime {
            let path = tg_migrations_path.join(runtime_name);
            if let Ok(true) = path.try_exists() {
                return Ok(Some(path));
            }
            return Ok(None);
        }
        let subdirs = fs::read_dir(tg_migrations_path.clone())
            .with_context(|| {
                format!("Reading from migrations directory at {tg_migrations_path:?}")
            })?
            .filter_map(|entry| -> Option<PathBuf> {
                entry.ok().map(|e| e.path()).filter(|p| p.is_dir())
            })
            .collect::<Vec<PathBuf>>();
        match subdirs.len() {
            0 => Ok(None),
            1 => Ok(subdirs.into_iter().next()),
            _ => bail!("Runtime name required: more than one runtimes are defined in the migrations directory"),
        }
    }

    pub fn serialize_migrations<P: AsRef<Path>>(
        base_path: P,
        typegraph: &str,
        runtime: Option<&str>,
    ) -> Result<Option<String>> {
        let migrations_path = Self::get_migrations_path(base_path, typegraph, runtime)?;
        Ok(match migrations_path {
            Some(p) => Some(common::archive::archive(p)?),
            None => None,
        })
    }

    fn new<P: AsRef<Path>>(
        typegraph: String,
        runtime: Option<String>,
        node: Node,
        base_migration_path: P, // TODO read from metatype.yaml
    ) -> Result<Self> {
        let migrations = Self::serialize_migrations(
            base_migration_path.as_ref(),
            &typegraph,
            runtime.as_deref(),
        )
        .context("Serializing migrations")?;

        Ok(Self {
            typegraph,
            runtime_name: runtime,
            node,
            migrations,
            base_migration_path: base_migration_path.as_ref().to_owned(),
        })
    }

    fn end(self) -> Result<()> {
        let migrations_path = self.base_migration_path.join(&self.typegraph).join(
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

    pub async fn diff(
        script: bool,
        node: &Node,
        tg: &String,
        rt: Option<&str>,
    ) -> Result<(String, bool)> {
        let res = node
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
                    "tg": tg,
                    "rt": rt,
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
}
