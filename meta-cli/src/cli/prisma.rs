// Copyright Metatype under the Elastic License 2.0.

use super::Action;
use crate::utils::{
    graphql::{self, Query},
    post_with_auth, BasicAuth,
};
use anyhow::{bail, Context, Result};
use clap::{Parser, Subcommand};
use colored::Colorize;
use flate2::{write::GzEncoder, Compression};
use indoc::indoc;
use question::{Answer, Question};
use serde::Deserialize;
use serde_json::json;
use std::fs::File;
use std::io::{self, Read, Write};
use std::path::PathBuf;
use std::time::Duration;

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
    /// Show prisma diff
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
    #[clap(long, value_parser)]
    runtime: Option<String>,

    /// Creates a migration based on the changes but does not apply that migration.
    #[clap(long, value_parser)]
    create_only: bool,

    /// Address of the typegate.
    #[clap(short, long, value_parser, default_value_t = String::from("http://localhost:7890"))]
    gate: String,
}

impl Action for Dev {
    fn run(&self, _dir: String) -> Result<()> {
        let migrate = PrismaMigrate::new(
            self.typegraph.clone(),
            self.runtime.clone(),
            format!("{}/typegate/prisma_migration", self.gate),
            BasicAuth::prompt()?,
        );

        migrate.apply(false)?;
        println!();

        let changes = migrate.diff(false)?;

        if changes {
            println!("A migration will be created and applied for the changes.");
            let ans = Question::new("Name of the migration to create (an empty string to skip):")
                .ask()
                .unwrap();
            if let Answer::RESPONSE(name) = ans {
                if !name.is_empty() {
                    migrate.create(name, !self.create_only)?;
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
    #[clap(long, value_parser)]
    runtime: String,

    /// Migration folder base.
    #[clap(long, value_parser)]
    migrations: String,

    /// Address of the typegate.
    #[clap(short, long, value_parser, default_value_t = String::from("http://localhost:7890"))]
    gate: String,
}

impl Action for Deploy {
    fn run(&self, dir: String) -> Result<()> {
        let migrations_path: PathBuf = [&dir, &self.migrations, &self.typegraph, &self.runtime]
            .iter()
            .collect();
        let enc = GzEncoder::new(Vec::new(), Compression::default());
        let mut tar = tar::Builder::new(enc);
        tar.append_dir_all("migrations", migrations_path.as_path())?;
        let enc = tar.into_inner()?;
        let migrations = enc.finish()?;
        let migrations = base64::encode(migrations);

        let res = reqwest::blocking::Client::new()
            .post(format!("{}/typegate/prisma_migration", self.gate))
            // .basic_auth("admin", Some(crate::config::admin_password()?))
            .timeout(Duration::from_secs(5))
            .gql(
                indoc! {"
                    mutation PrismaDeploy($tg: String!, $runtime: String!, $mig: String!) {
                        prismaDeploy(typegraph: $tg, runtime: $runtime, migrations: $mig) {
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
            )?;

        #[derive(serde::Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct PrismaDeployResult {
            // TODO runtime_name: String, // for printing relative path...
            migration_count: usize,
            applied_migrations: Vec<String>,
        }
        let result: PrismaDeployResult = res.data("prismaDeploy")?;

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
    #[clap(value_parser, long)]
    script: bool,

    /// Address of the typegate
    #[clap(short, long, value_parser, default_value_t = String::from("http://localhost:7890"))]
    gate: String,

    /// Name of the prisma runtime.
    /// Default: the unique prisma runtime of the typegraph.
    #[clap(long, value_parser)]
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

impl Action for Diff {
    fn run(&self, _dir: String) -> Result<()> {
        // TODO runtime selection
        let migrate = PrismaMigrate::new(
            self.typegraph.clone(),
            self.runtime.clone(),
            format!("{}/typegate/prisma_migration", self.gate),
            BasicAuth::prompt()?,
        );
        migrate.diff(self.script)?;
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

struct PrismaMigrate {
    typegraph: String,
    runtime: Option<String>,
    gql_endpoint: String,
    auth: BasicAuth,
}

impl PrismaMigrate {
    fn new(
        typegraph: String,
        runtime: Option<String>,
        gql_endpoint: String,
        auth: BasicAuth,
    ) -> Self {
        Self {
            typegraph,
            runtime,
            gql_endpoint,
            auth,
        }
    }

    /// Apply pending migrations
    fn apply(&self, reset_database: bool) -> Result<()> {
        enum ApplyResponse {
            Ok(graphql::Response),
            ResetRequired(String),
        }

        let res = post_with_auth(&self.auth, &self.gql_endpoint)?
            .gql(
                indoc! {"
                mutation PrismaApply($tg: String!, $rt: String, $reset: Boolean!) {
                    prismaApply(typegraph: $tg, runtime: $rt, resetDatabase: $reset) {
                        databaseReset
                        appliedMigrations
                    }
                }
            "}
                .to_string(),
                Some(json!({
                    "tg": self.typegraph,
                    "rt": self.runtime,
                    "reset": reset_database,
                })),
            )
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
                if let Answer::YES = ans {
                    println!();
                    return self.apply(true);
                }
                bail!("Operation aborted.");
            }

            ApplyResponse::Ok(res) => {
                #[derive(serde::Deserialize)]
                #[serde(rename_all = "camelCase")]
                struct Res {
                    database_reset: bool,
                    applied_migrations: Vec<String>,
                }

                let res: Res = res.data("prismaApply")?;
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
    fn create(&self, name: String, apply: bool) -> Result<()> {
        let res = post_with_auth(&self.auth, &self.gql_endpoint)?
            .gql(
                indoc! {"
                    mutation PrismaCreate($tg: String!, $rt: String, $name: String!, $apply: Boolean) {
                        prismaCreate(typegraph: $tg, runtime: $rt, name: $name, apply: $apply) {
                            createdMigrationName
                            appliedMigrations
                        }
                    }
                "}
                .to_string(),
                Some(json!({
                    "tg": self.typegraph,
                    "rt": self.runtime,
                    "name": name,
                    "apply": apply
                }))
            )?;

        res.display_errors();

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Res {
            created_migration_name: String,
            applied_migrations: Vec<String>,
        }
        let res: Res = res.data("prismaCreate")?;

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

        Ok(())
    }

    pub fn diff(&self, script: bool) -> Result<bool> {
        let res = post_with_auth(&self.auth, &self.gql_endpoint)?.gql(
            indoc! {"
                    query PrismaDiff($tg: String!, $rt: String, $script: Boolean) {
                        prismaDiff(typegraph: $tg, runtime: $rt, script: $script) {
                            runtime {
                                name
                                connectionString
                            }
                            diff
                        }
                    }
                "}
            .to_string(),
            Some(json!({
                "tg": self.typegraph,
                "script": script,
                "rt": self.runtime,
            })),
        )?;

        res.display_errors();

        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Res {
            runtime: PrismaRuntime,
            diff: Option<String>,
        }

        let res: Res = res.data("prismaDiff")?;

        println!("Diff for {}", res.runtime.name);

        if let Some(diff) = res.diff.as_ref() {
            println!("{}", diff.blue());
            Ok(true)
        } else {
            println!("{}", "No changes.".dimmed());
            Ok(false)
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrismaRuntime {
    name: String,
    connection_string: String,
}
