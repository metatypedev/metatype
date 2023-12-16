// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/rpc.rs
// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/api.rs

use crate::interlude::*;
use anyhow::Result;
use convert_case::{Case, Casing};
use log::{error, trace};
use regex::Regex;
use schema_core::json_rpc::types::{
    ApplyMigrationsInput, CreateMigrationInput, DevAction, DevDiagnosticInput, DevDiagnosticOutput,
    DiffParams, DiffTarget, EvaluateDataLossInput, ListMigrationDirectoriesInput, SchemaContainer,
};
use schema_core::{CoreError, CoreResult, GenericApi};
use serde::Serialize;
use std::io::Write;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tempfile::{tempdir_in, NamedTempFile, TempDir};

#[allow(dead_code)]
pub async fn loss(
    datasource: String,
    datamodel: String,
    migration_folder: String,
) -> Result<String, CoreError> {
    let schema = format!("{datasource}{datamodel}");
    let api = schema_core::schema_api(Some(datasource.clone()), None)?;
    let data_loss = EvaluateDataLossInput {
        migrations_directory_path: migration_folder.to_string(),
        prisma_schema: schema.to_string(),
    };

    let loss = match api.evaluate_data_loss(data_loss).await {
        Ok(loss) => loss.warnings.into_iter().map(|w| w.message).collect(),
        Err(err) => vec![format!("error: {}", err)],
    };

    if loss.is_empty() {
        Ok("no data loss".to_string())
    } else {
        Ok(loss.join("\n"))
    }
}

pub struct MigrationContextBuilder {
    pub datasource: String,
    pub datamodel: String,
    tmp_dir_path: Arc<Path>,
    migrations: Option<String>,
}

impl MigrationContextBuilder {
    pub fn new(datasource: String, datamodel: String, tmp_dir_path: Arc<Path>) -> Self {
        Self {
            datasource,
            datamodel,
            tmp_dir_path,
            migrations: None,
        }
    }

    pub fn with_migrations(self, migrations: Option<String>) -> Self {
        Self { migrations, ..self }
    }

    pub fn build(self) -> Result<MigrationContext> {
        let api = schema_core::schema_api(Some(self.datasource.clone()), None)
            .tap_err(|e| error!("{e:?}"))?;
        let migrations_dir = MigrationsFolder::from(&self.tmp_dir_path, self.migrations.as_ref())
            .tap_err(|e| error!("{e:?}"))?;
        Ok(MigrationContext {
            builder: self,
            migrations_dir,
            api,
        })
    }
}

pub struct MigrationContext {
    builder: MigrationContextBuilder,
    migrations_dir: MigrationsFolder,
    api: Box<dyn GenericApi>,
}

impl MigrationContext {
    async fn dev_diagnostic(&self) -> CoreResult<DevDiagnosticOutput> {
        // See: /schema-engin/core/src/commands/dev_diagnostic.rs
        // Returns error if drift by migration failure or error in unapplied migrations
        // Returns Reset(reason) if there are failed migrations, edited migrations, drift, history
        // divergence, or if migrations directory is behind
        // Otherwise: CreateMigration
        self.api
            .dev_diagnostic(DevDiagnosticInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
    }

    fn schema(&self) -> String {
        format!("{}{}", self.builder.datasource, self.builder.datamodel)
    }
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub enum PrismaApplyResult {
    ResetRequired {
        reset_reason: String,
    },
    Ok {
        applied_migrations: Vec<String>,
        reset_reason: Option<String>,
    },
}

impl MigrationContext {
    pub async fn apply(&self, reset_database: bool) -> Result<PrismaApplyResult> {
        trace!("Migrations::apply");

        let res = self.dev_diagnostic().await.tap_err(|e| error!("{e:?}"))?;

        let reset_reason = if let DevAction::Reset(reset) = res.action {
            if reset_database {
                self.api.reset().await.tap_err(|e| error!("{e:?}"))?;
                Some(reset.reason)
            } else {
                return Ok(PrismaApplyResult::ResetRequired {
                    reset_reason: reset.reason,
                });
            }
        } else {
            None
        };

        let res = self
            .api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:}"))?;
        Ok(PrismaApplyResult::Ok {
            applied_migrations: res.applied_migration_names,
            reset_reason,
        })
    }
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct PrismaCreateResult {
    created_migration_name: Option<String>,
    migrations: Option<String>,
    apply_err: Option<String>,
}

impl MigrationContext {
    pub async fn create(&self, name: String, apply: bool) -> Result<PrismaCreateResult> {
        trace!("Migrations::create (name={name:?}, apply={apply})");
        let res = self
            .api
            .create_migration(CreateMigrationInput {
                draft: !apply,
                migration_name: name.to_case(Case::Snake),
                migrations_directory_path: self.migrations_dir.to_string(),
                prisma_schema: self.schema(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))?;
        let Some(generated_migration_name) = res.generated_migration_name else {
            return Ok(PrismaCreateResult {
                created_migration_name: None,
                migrations: None,
                apply_err: None,
            });
        };
        // migration directory cannot be empty...
        let migrations = self
            .migrations_dir
            .serialize()
            .tap_err(|e| error!("{e:?}"))
            .ok()
            .flatten()
            .unwrap();
        let apply_err = self
            .api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))
            .map_err(err_to_string)
            .err();

        Ok(PrismaCreateResult {
            created_migration_name: Some(generated_migration_name),
            migrations: Some(migrations),
            apply_err,
        })
    }
}

pub async fn diff(
    tmp_dir_path: &Path,
    datasource: String,
    datamodel: String,
    script: bool,
) -> Result<Option<(String, Vec<ParsedDiff>)>> {
    trace!("diff");
    let schema = format!("{datasource}{datamodel}");
    let buffer = Arc::new(Mutex::new(Some(String::default())));
    let api = schema_core::schema_api(
        Some(datasource.clone()),
        Some(Arc::new(super::utils::StringBuffer::new(Arc::clone(
            &buffer,
        )))),
    )?;

    let dir = tempdir_in(tmp_dir_path)?;
    let mut source_file = NamedTempFile::new_in(&dir)?;
    writeln!(source_file, "{datasource}").unwrap();

    let mut model_file = NamedTempFile::new_in(&dir)?;
    writeln!(model_file, "{schema}").unwrap();

    let params = DiffParams {
        exit_code: None,
        from: DiffTarget::SchemaDatasource(SchemaContainer {
            schema: source_file.path().display().to_string(),
        }),
        script,
        shadow_database_url: None,
        to: DiffTarget::SchemaDatamodel(SchemaContainer {
            schema: model_file.path().display().to_string(),
        }),
    };

    let res = api.diff(params).await?;
    assert!(res.exit_code == 0);

    let buffer = buffer.lock().unwrap().take();
    // FIXME the text might change??
    let diff = buffer.filter(|diff| !diff.contains("No difference detected"));

    Ok(diff.map(|diff| {
        let parsed_diff = ParsedDiff::parse(&diff);
        (diff, parsed_diff)
    }))
}

#[derive(Default)]
struct DiffFoldRes {
    result: Vec<ParsedDiff>,
    current: Option<ParsedDiff>,
}

#[derive(Debug, Serialize)]
enum ColumnTypeDiff {
    NullableToRequired,
    RequiredToNullable,
}

#[derive(Debug, Serialize)]
struct TableDiff {
    column: String,
    diff: ColumnDiff,
}

#[derive(Debug, Serialize)]
#[serde(tag = "action")]
enum ColumnDiff {
    Added,
    Removed,
    Altered { type_diff: Option<ColumnTypeDiff> },
}

impl TableDiff {
    fn new(line: &str) -> Option<Self> {
        let regex = Regex::new(r"Added column `([^`]+)`").unwrap();
        if let Some(added_column) = regex.captures(line) {
            return Some(TableDiff {
                column: added_column.get(1).unwrap().as_str().to_string(),
                diff: ColumnDiff::Added,
            });
        }
        let regex = Regex::new(r"Removed column `([^`]+)`").unwrap();
        if let Some(removed_column) = regex.captures(line) {
            return Some(TableDiff {
                column: removed_column.get(1).unwrap().as_str().to_string(),
                diff: ColumnDiff::Removed,
            });
        }
        let regex = Regex::new(r"Altered column `([^`]+)` (.+)$").unwrap();
        if let Some(altered_column) = regex.captures(line) {
            let column_name = altered_column.get(1).unwrap().as_str().to_string();
            let diff = altered_column.get(2).unwrap().as_str();

            let type_diff = if diff.contains("from Nullable to Required") {
                Some(ColumnTypeDiff::NullableToRequired)
            } else if diff.contains("from Required to Nullable") {
                Some(ColumnTypeDiff::RequiredToNullable)
            } else {
                None
            };

            return Some(TableDiff {
                column: column_name,
                diff: ColumnDiff::Altered { type_diff },
            });
        }

        None
    }
}

#[derive(Debug, Serialize)]
pub struct ParsedDiff {
    table: String,
    diff: Vec<TableDiff>,
}

impl ParsedDiff {
    fn new(line: &str) -> Option<Self> {
        let regex = Regex::new(r"Changed the `([^`]+)` table").unwrap();
        if let Some(table) = regex.captures(line) {
            return Some(ParsedDiff {
                table: table.get(1).unwrap().as_str().to_string(),
                diff: Vec::new(),
            });
        }
        None
    }

    fn parse(description: &str) -> Vec<Self> {
        let mut res = description
            .lines()
            .fold(DiffFoldRes::default(), |mut acc, line| {
                if line.starts_with("  ") {
                    if let Some(current) = acc.current.as_mut() {
                        if let Some(diff) = TableDiff::new(line) {
                            current.diff.push(diff);
                        }
                    }
                } else {
                    if let Some(current) = acc.current.take() {
                        acc.result.push(current);
                    }

                    acc.current = Self::new(line);
                }
                acc
            });
        if let Some(current) = res.current {
            res.result.push(current);
        }

        res.result
    }
}

#[derive(Serialize)]
#[serde(crate = "serde")]
pub struct PrismaDeployOut {
    migration_count: usize,
    applied_migrations: Vec<String>,
}

impl MigrationContext {
    pub async fn deploy(&self) -> Result<PrismaDeployOut> {
        let res = self
            .api
            .list_migration_directories(ListMigrationDirectoriesInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))?;
        let migration_count = res.migrations.len();

        let res = self
            .api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))?;
        let applied_migrations = res.applied_migration_names;

        Ok(PrismaDeployOut {
            migration_count,
            applied_migrations,
        })
    }
}

fn err_to_string(err: CoreError) -> String {
    err.to_user_facing().message().to_string()
}

impl MigrationContext {
    pub async fn reset(&self) -> Result<bool> {
        match self.api.reset().await {
            Err(e) => Err(anyhow::format_err!(e
                .to_user_facing()
                .message()
                .to_string())),
            Ok(_) => Ok(true),
        }
    }
}

struct MigrationsFolder {
    dir: TempDir,
}

impl MigrationsFolder {
    pub fn from(tmp_dir_path: &Path, serialized: Option<impl AsRef<[u8]>>) -> Result<Self> {
        let tempdir = tempdir_in(tmp_dir_path)?;
        common::archive::unpack(&tempdir, serialized)?;
        Ok(Self { dir: tempdir })
    }

    fn serialize(&self) -> Result<Option<String>> {
        common::archive::archive(self)
    }
}

impl AsRef<Path> for MigrationsFolder {
    fn as_ref(&self) -> &Path {
        self.dir.as_ref()
    }
}

impl ToString for MigrationsFolder {
    fn to_string(&self) -> String {
        self.as_ref().to_str().unwrap().to_owned()
    }
}
