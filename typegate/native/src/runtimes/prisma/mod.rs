#![allow(clippy::not_unsafe_ptr_arg_deref)]

// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

mod engine;
mod engine_import;
use once_cell::sync::Lazy;
use regex::Regex;
mod migration;
use crate::RT;
use dashmap::DashMap;
mod utils;
use macros::{deno, deno_sync};

use self::migration::{
    MigrationContextBuilder, PrismaApplyResult, PrismaCreateResult, PrismaDeployOut,
    PrismaResetResult,
};

static ENGINES: Lazy<DashMap<String, engine_import::QueryEngine>> = Lazy::new(DashMap::new);

// register engine
#[deno]
struct PrismaRegisterEngineInp {
    datamodel: String,
    engine_name: String,
}

#[deno]
enum PrismaRegisterEngineOut {
    Ok,
    Err { message: String },
}

#[deno]
fn prisma_register_engine(input: PrismaRegisterEngineInp) -> PrismaRegisterEngineOut {
    let datamodel = prisma_models::psl::reformat(&input.datamodel, 4);

    let datamodel = match datamodel {
        Some(dm) => dm,
        None => {
            log::error!("Error formatting datamodel:\n{}", input.datamodel);
            return PrismaRegisterEngineOut::Err {
                message: "Error formatting datamodel".to_string(),
            };
        }
    };

    log::info!("Reformatted datamodel:\n{}", datamodel);

    match RT.block_on(engine::register_engine(datamodel, input.engine_name)) {
        Ok(()) => PrismaRegisterEngineOut::Ok,
        Err(e) => {
            log::error!("Error registering engine: {:?}", e);
            PrismaRegisterEngineOut::Err {
                message: e.to_string(),
            }
        }
    }
}

// unregister engine

#[deno]
struct PrismaUnregisterEngineInp {
    engine_name: String,
}

#[deno]
enum PrismaUnregisterEngineOut {
    Ok,
    Err { message: String },
}

#[deno]
fn prisma_unregister_engine(input: PrismaUnregisterEngineInp) -> PrismaUnregisterEngineOut {
    let Some((_, engine)) = ENGINES.remove(&input.engine_name) else {
        return PrismaUnregisterEngineOut::Err { message: format!("Could not remove engine {:?}: entry not found.", {input.engine_name})};
    };
    match RT.block_on(engine.disconnect()) {
        Ok(()) => PrismaUnregisterEngineOut::Ok,
        Err(e) => PrismaUnregisterEngineOut::Err {
            message: format!("{:?}", e),
        },
    }
}

// query

#[deno]
struct PrismaQueryInp {
    engine_name: String,
    query: serde_json::Value,
    datamodel: String,
}

#[deno]
enum PrismaQueryOut {
    Ok { res: String },
    Err { message: String },
}

#[deno]
fn prisma_query(input: PrismaQueryInp) -> PrismaQueryOut {
    let fut = RT.block_on(engine::query(input.engine_name, input.query));
    match fut {
        Ok(res) => PrismaQueryOut::Ok { res },
        Err(err) => PrismaQueryOut::Err {
            message: err.to_string(),
        },
    }
}

#[deno]
struct PrismaDiffInp {
    datasource: String,
    datamodel: String,
    script: bool,
}

#[deno]
enum PrismaDiffOut {
    Ok { diff: Option<String> },
    Err { message: String },
}

#[deno]
fn prisma_diff(input: PrismaDiffInp) -> PrismaDiffOut {
    let res = migration::diff(input.datasource, input.datamodel, input.script);
    match RT.block_on(res) {
        Ok(diff) => PrismaDiffOut::Ok { diff },
        Err(e) => PrismaDiffOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct PrismaDevInp {
    pub datasource: String,
    pub datamodel: String,
    pub migrations: Option<String>,
    pub reset_database: bool,
}

#[deno]
fn prisma_apply(input: PrismaDevInp) -> PrismaApplyResult {
    RT.block_on(migration::apply(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(input.migrations),
        input.reset_database,
    ))
}

#[deno]
struct PrismaDeployInp {
    datasource: String,
    datamodel: String,
    migrations: String,
}

#[deno]
fn prisma_deploy(input: PrismaDeployInp) -> PrismaDeployOut {
    RT.block_on(migration::deploy(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(Some(input.migrations)),
    ))
}

#[deno]
pub struct PrismaCreateInp {
    datasource: String,
    datamodel: String,
    migrations: Option<String>,
    migration_name: String,
    apply: bool,
}

#[deno]
fn prisma_create(input: PrismaCreateInp) -> PrismaCreateResult {
    RT.block_on(migration::create(
        MigrationContextBuilder::new(input.datasource, input.datamodel)
            .with_migrations(input.migrations),
        input.migration_name,
        input.apply,
    ))
}

#[deno]
pub struct PrismaResetInp {
    datasource: String,
}

#[deno]
fn prisma_reset(input: PrismaResetInp) -> PrismaResetResult {
    RT.block_on(migration::reset(MigrationContextBuilder::new(
        input.datasource,
        "".to_string(),
    )))
}

#[deno]
struct UnpackInp {
    dest: String,
    migrations: String,
}

#[deno]
enum UnpackResult {
    Ok,
    Err { message: String },
}

#[deno]
fn unpack(input: UnpackInp) -> UnpackResult {
    match common::archive::unpack(&input.dest, Some(input.migrations)) {
        Ok(_) => UnpackResult::Ok,
        Err(e) => UnpackResult::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct ArchiveInp {
    path: String,
}

#[deno]
enum ArchiveResult {
    Ok { base64: Option<String> },
    Err { message: String },
}

#[deno]
fn archive(input: ArchiveInp) -> ArchiveResult {
    match common::archive::archive(input.path) {
        Ok(b) => ArchiveResult::Ok { base64: b },
        Err(e) => ArchiveResult::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct QueryFormatInp {
    query: String,
    parameters: serde_json::Value,
}

#[deno]
enum QueryFormatOutput {
    Ok { res: String },
    Err { message: String },
}

#[deno_sync]
fn replace_variables_to_indices(input: QueryFormatInp) -> QueryFormatOutput {
    let mut proc_query = input.query.clone();
    match input.parameters {
        serde_json::Value::Object(map) => {
            let mut not_present = vec![];
            for (index, (var, _)) in map.iter().enumerate() {
                // Note: pattern matches ${var}, ${  var}, ${ var  }, ..
                let pattern = format!("\\$\\{{\\s*{var}\\s*\\}}");
                match Regex::new(&pattern) {
                    Ok(re) => {
                        if !re.is_match(&proc_query) {
                            not_present.push(format!("{:?}", var));
                        } else {
                            proc_query = re
                                .replace_all(&proc_query, &format!("$${}", index + 1))
                                .to_string();
                        }
                    }
                    Err(e) => {
                        return QueryFormatOutput::Err {
                            message: e.to_string(),
                        }
                    }
                }
            }
            if !not_present.is_empty() {
                return QueryFormatOutput::Err {
                    message: format!(
                        "{} present in type definition but not in the query",
                        not_present.join(", ")
                    ),
                };
            }
            QueryFormatOutput::Ok { res: proc_query }
        }
        _ => QueryFormatOutput::Err {
            message: "input is not an object".to_string(),
        },
    }
}
