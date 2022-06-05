// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/rpc.rs
// https://github.com/prisma/prisma-engines/blob/main/migration-engine/core/src/api.rs
use migration_core;
use migration_core::json_rpc::types::{
    ApplyMigrationsInput, CreateMigrationInput, DiffParams, DiffTarget, EvaluateDataLossInput,
    SchemaContainer, SchemaPushInput,
};
use migration_core::CoreError;
use std::fs;
use std::io::Write;

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

    if loss.len() == 0 {
        Ok("no data loss".to_string())
    } else {
        Ok(loss.join("\n"))
    }
}

pub async fn create(
    datasource: String,
    datamodel: String,
    migration_folder: String,
    migration_name: String,
) -> Result<String, CoreError> {
    let schema = format!("{datasource}{datamodel}");
    let api = migration_core::migration_api(Some(datasource.clone()), None)?;
    let migration = CreateMigrationInput {
        migrations_directory_path: migration_folder.to_string(),
        prisma_schema: schema,
        migration_name: migration_name,
        draft: false,
    };

    let migration = api.create_migration(migration).await?;
    if let Some(mig_name) = migration.generated_migration_name {
        Ok(format!("Generated: {mig_name}"))
    } else {
        Ok("No migration".to_string())
    }
}

pub async fn apply(datasource: String, migration_folder: String) -> Result<String, CoreError> {
    let api = migration_core::migration_api(Some(datasource.clone()), None)?;
    let migrations = api
        .apply_migrations(ApplyMigrationsInput {
            migrations_directory_path: migration_folder.to_string(),
        })
        .await?;
    if migrations.applied_migration_names.len() > 0 {
        fs::remove_dir_all(migration_folder).unwrap();
        Ok("success".to_string())
    } else {
        Ok("no modification".to_string())
    }
}

pub async fn push(datasource: String, datamodel: String) -> Result<String, CoreError> {
    let schema = format!("{datasource}{datamodel}");
    let api = migration_core::migration_api(Some(datasource.clone()), None)?;

    let push = SchemaPushInput {
        force: false,
        schema,
    };

    let apply = api.schema_push(push).await?;
    if apply.unexecutable.len() > 0 || apply.warnings.len() > 0 {
        Ok(apply.unexecutable.join("\n") + &apply.warnings.join("\n"))
    } else {
        Ok("applied".to_string())
    }
}

pub async fn diff(datasource: String, datamodel: String) -> Result<u32, CoreError> {
    let schema = format!("{datasource}{datamodel}");
    let api = migration_core::migration_api(Some(datasource.clone()), None)?;

    let mut source_file = tempfile::NamedTempFile::new().unwrap();
    writeln!(source_file, "{datasource}").unwrap();

    let mut model_file = tempfile::NamedTempFile::new().unwrap();
    writeln!(model_file, "{schema}").unwrap();

    let params = DiffParams {
        exit_code: None,
        from: DiffTarget::SchemaDatasource(SchemaContainer {
            schema: source_file.path().display().to_string(),
        }),
        script: false,
        shadow_database_url: None,
        to: DiffTarget::SchemaDatamodel(SchemaContainer {
            schema: model_file.path().display().to_string(),
        }),
    };

    let res = api.diff(params).await?;
    Ok(res.exit_code)
}
