// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/rpc.rs
// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/api.rs

use anyhow::{anyhow, Context, Result};
use convert_case::{Case, Casing};
use log::info;
use migration_core::json_rpc::types::{
    ApplyMigrationsInput, CreateMigrationInput, DiffParams, DiffTarget, EvaluateDataLossInput,
    ListMigrationDirectoriesInput, SchemaContainer,
};
use migration_core::CoreError;
use std::io::Write;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tempfile::{tempdir_in, NamedTempFile, TempDir};

use crate::TMP_DIR;

#[allow(dead_code)]
pub async fn loss(
    datasource: String,
    datamodel: String,
    migration_folder: String,
) -> Result<String, CoreError> {
    let schema = format!("{datasource}{datamodel}");
    let api = migration_core::migration_api(Some(datasource.clone()), None)?;

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

pub(super) async fn apply(inp: super::PrismaApplyInp) -> Result<super::PrismaApplyOut> {
    use migration_core::json_rpc::types::{DevAction, DevDiagnosticInput};
    use migration_core::migration_api;

    let migrations = MigrationsFolder::from(inp.migrations)?;

    let api = migration_api(Some(inp.datasource), None)?;

    let res = api
        .dev_diagnostic(DevDiagnosticInput {
            migrations_directory_path: migrations.to_string(),
        })
        .await?;

    let reset_reason: Option<String> = if let DevAction::Reset(reset) = res.action {
        if inp.reset_database {
            api.reset().await.context("Reset database")?;
            Some(reset.reason)
        } else {
            return Ok(super::PrismaApplyOut::ResetRequired {
                reset_reason: reset.reason,
            });
        }
    } else {
        None
    };

    let res = api
        .apply_migrations(ApplyMigrationsInput {
            migrations_directory_path: migrations.to_string(),
        })
        .await?;

    let applied_migrations = res.applied_migration_names;

    Ok(super::PrismaApplyOut::MigrationsApplied {
        reset_reason,
        applied_migrations,
        migrations: migrations.serialize()?,
    })
}

pub(super) async fn create(input: super::PrismaCreateInp) -> Result<super::PrismaCreateOut> {
    use migration_core::migration_api;

    let migrations = MigrationsFolder::from(input.migrations)?;

    let api = migration_api(Some(input.datasource.clone()), None).context("Get migration api")?;

    let res = api
        .create_migration(CreateMigrationInput {
            draft: !input.apply,
            migration_name: input.migration_name.to_case(Case::Snake),
            migrations_directory_path: migrations.to_string(),
            prisma_schema: format!("{}{}", input.datasource, input.datamodel),
        })
        .await
        .context("Create migration")?;

    let created_migration_name = res.generated_migration_name;

    let applied_migrations = if input.apply {
        let res = api
            .apply_migrations(ApplyMigrationsInput {
                migrations_directory_path: migrations.to_string(),
            })
            .await
            .map_err(|e| anyhow!("Error while applying migrations: {e}"))?;

        res.applied_migration_names
    } else {
        vec![]
    };

    Ok(super::PrismaCreateOut::Ok {
        created_migration_name,
        applied_migrations,
        migrations: migrations.serialize()?,
    })
}

pub async fn diff(datasource: String, datamodel: String, script: bool) -> Result<Option<String>> {
    let schema = format!("{datasource}{datamodel}");
    let buffer = Arc::new(Mutex::new(Some(String::default())));
    let api = migration_core::migration_api(
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

pub async fn deploy(
    datasource: String,
    _datamodel: String,
    migrations: String,
) -> Result<(usize, Vec<String>)> {
    let migrations = MigrationsFolder::from(Some(migrations))?;

    let api = migration_core::migration_api(Some(datasource), None)?;

    let res = api
        .list_migration_directories(ListMigrationDirectoriesInput {
            migrations_directory_path: migrations.to_string(),
        })
        .await?;
    let migration_count = res.migrations.len();

    info!(
        "migrations in {}: {:?}",
        migrations.to_string(),
        res.migrations
    );

    let res = api
        .apply_migrations(ApplyMigrationsInput {
            migrations_directory_path: migrations.to_string(),
        })
        .await?;
    let applied_migrations = res.applied_migration_names;

    Ok((migration_count, applied_migrations))
}

pub async fn reset(datasource: String) -> Result<bool> {
    let api = migration_core::migration_api(Some(datasource), None)?;

    api.reset().await?;
    Ok(true)
}

struct MigrationsFolder {
    dir: TempDir,
}

impl MigrationsFolder {
    pub fn from(serialized: Option<String>) -> Result<Self> {
        let tempdir = tempdir_in(TMP_DIR.as_path())?;
        common::archive::unpack(&tempdir, serialized)?;
        Ok(Self { dir: tempdir })
    }

    fn serialize(self) -> Result<String> {
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
