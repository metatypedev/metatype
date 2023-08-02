// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/rpc.rs
// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/api.rs

use anyhow::Result;
use convert_case::{Case, Casing};
use log::{error, trace};
use macros::deno;
use schema_core::json_rpc::types::{
    ApplyMigrationsInput, CreateMigrationInput, DevAction, DevDiagnosticInput, DevDiagnosticOutput,
    DiffParams, DiffTarget, EvaluateDataLossInput, ListMigrationDirectoriesInput, SchemaContainer,
};
use schema_core::{CoreError, CoreResult, GenericApi};
use std::io::Write;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tap::prelude::*;
use tempfile::{tempdir_in, NamedTempFile, TempDir};

use crate::TMP_DIR;

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
    migrations: Option<String>,
}

impl MigrationContextBuilder {
    pub fn new(datasource: String, datamodel: String) -> Self {
        Self {
            datasource,
            datamodel,
            migrations: None,
        }
    }

    pub fn with_migrations(self, migrations: Option<String>) -> Self {
        Self {
            datasource: self.datasource,
            datamodel: self.datamodel,
            migrations,
        }
    }

    fn build(self) -> Result<MigrationContext, String> {
        let api = schema_core::schema_api(Some(self.datasource.clone()), None)
            .tap_err(|e| error!("{e:?}"))
            .map_err(err_to_string)?;
        let migrations_dir = MigrationsFolder::from(self.migrations.as_ref())
            .tap_err(|e| error!("{e:?}"))
            .map_err(|e| e.to_string())?;
        Ok(MigrationContext {
            builder: self,
            migrations_dir,
            api,
        })
    }
}

struct MigrationContext {
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

#[deno]
pub enum PrismaApplyResult {
    Err {
        message: String,
    },
    ResetRequired {
        reset_reason: String,
    },
    Ok {
        applied_migrations: Vec<String>,
        reset_reason: Option<String>,
    },
}

impl From<Result<PrismaApplyResult, String>> for PrismaApplyResult {
    fn from(res: Result<PrismaApplyResult, String>) -> Self {
        match res {
            Err(message) => PrismaApplyResult::Err { message },
            Ok(res) => res,
        }
    }
}

impl MigrationContext {
    async fn apply(&self, reset_database: bool) -> Result<PrismaApplyResult, String> {
        trace!("Migrations::apply");

        let res = self
            .dev_diagnostic()
            .await
            .tap_err(|e| error!("{e:?}"))
            .map_err(err_to_string)?;

        let reset_reason = if let DevAction::Reset(reset) = res.action {
            if reset_database {
                self.api
                    .reset()
                    .await
                    .tap_err(|e| error!("{e:?}"))
                    .map_err(err_to_string)?;
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
            .tap_err(|e| error!("{e:}"))
            .map_err(err_to_string)?;
        Ok(PrismaApplyResult::Ok {
            applied_migrations: res.applied_migration_names,
            reset_reason,
        })
    }
}

pub async fn apply(ctx: MigrationContextBuilder, reset_database: bool) -> PrismaApplyResult {
    let ctx = match ctx.build() {
        Err(e) => return Err(e).into(),
        Ok(ctx) => ctx,
    };
    ctx.apply(reset_database).await.into()
}

#[deno]
pub enum PrismaCreateResult {
    Err {
        message: String,
    },
    Ok {
        created_migration_name: Option<String>,
        migrations: Option<String>,
        apply_err: Option<String>,
    },
}

impl MigrationContext {
    pub async fn create(&self, name: String, apply: bool) -> PrismaCreateResult {
        trace!("Migrations::create (name={name:?}, apply={apply})");

        match self
            .api
            .create_migration(CreateMigrationInput {
                draft: !apply,
                migration_name: name.to_case(Case::Snake),
                migrations_directory_path: self.migrations_dir.to_string(),
                prisma_schema: self.schema(),
            })
            .await
        {
            Err(e) => PrismaCreateResult::Err {
                message: e.tap(|e| error!("{e:?}")).pipe(err_to_string),
            },
            Ok(res) => {
                let Some(generated_migration_name) = res.generated_migration_name else {
                    return PrismaCreateResult::Ok {
                        created_migration_name: None,
                        migrations: None,
                        apply_err: None,
                    };
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

                PrismaCreateResult::Ok {
                    created_migration_name: Some(generated_migration_name),
                    migrations: Some(migrations),
                    apply_err,
                }
            }
        }
    }
}

pub async fn create(ctx: MigrationContextBuilder, name: String, apply: bool) -> PrismaCreateResult {
    let ctx = match ctx.build() {
        Err(message) => return PrismaCreateResult::Err { message },
        Ok(ctx) => ctx,
    };
    ctx.create(name, apply).await
}

pub async fn diff(datasource: String, datamodel: String, script: bool) -> Result<Option<String>> {
    trace!("diff");
    let schema = format!("{datasource}{datamodel}");
    let buffer = Arc::new(Mutex::new(Some(String::default())));
    let api = schema_core::schema_api(
        Some(datasource.clone()),
        Some(Arc::new(super::utils::StringBuffer::new(Arc::clone(
            &buffer,
        )))),
    )?;

    let dir = tempdir_in(TMP_DIR.as_path())?;
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
    let mut diff = buffer.filter(|diff| !diff.contains("No difference detected"));
    Ok(diff.take())
}

#[deno]
pub enum PrismaDeployOut {
    Err {
        message: String,
    },
    Ok {
        migration_count: usize,
        applied_migrations: Vec<String>,
    },
}

impl From<Result<PrismaDeployOut, String>> for PrismaDeployOut {
    fn from(res: Result<PrismaDeployOut, String>) -> Self {
        match res {
            Err(message) => Self::Err { message },
            Ok(res) => res,
        }
    }
}

impl MigrationContext {
    async fn deploy(&self) -> Result<PrismaDeployOut, String> {
        let res = self
            .api
            .list_migration_directories(ListMigrationDirectoriesInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))
            .map_err(err_to_string)?;
        let migration_count = res.migrations.len();

        let res = self
            .api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: self.migrations_dir.to_string(),
            })
            .await
            .tap_err(|e| error!("{e:?}"))
            .map_err(err_to_string)?;
        let applied_migrations = res.applied_migration_names;

        Ok(PrismaDeployOut::Ok {
            migration_count,
            applied_migrations,
        })
    }
}

pub async fn deploy(ctx: MigrationContextBuilder) -> PrismaDeployOut {
    let ctx = match ctx.build() {
        Err(e) => return Err(e).into(),
        Ok(ctx) => ctx,
    };
    ctx.deploy().await.into()
}

fn err_to_string(err: CoreError) -> String {
    err.to_user_facing().message().to_string()
}

#[deno]
pub enum PrismaResetResult {
    Err { message: String },
    Ok { reset: bool },
}

impl MigrationContext {
    async fn reset(&self) -> PrismaResetResult {
        match self.api.reset().await {
            Err(e) => PrismaResetResult::Err {
                message: e.to_user_facing().message().to_string(),
            },
            Ok(_) => PrismaResetResult::Ok { reset: true },
        }
    }
}

pub async fn reset(ctx: MigrationContextBuilder) -> PrismaResetResult {
    let ctx = match ctx.build() {
        Err(message) => return PrismaResetResult::Err { message },
        Ok(ctx) => ctx,
    };
    ctx.reset().await
}

struct MigrationsFolder {
    dir: TempDir,
}

impl MigrationsFolder {
    pub fn from(serialized: Option<impl AsRef<[u8]>>) -> Result<Self> {
        let tempdir = tempdir_in(TMP_DIR.as_path())?;
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
