// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0
use crate::interlude::*;
use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use anyhow::{Context, Result};
use query_core::protocol::EngineProtocol;

pub(super) const CONFIG_DIR: &str = ".";

pub async fn register_engine(
    ctx: &super::Ctx,
    datamodel: String,
    engine_name: String,
) -> Result<()> {
    let conf = super::engine_import::ConstructorOptions {
        datamodel,
        log_level: "info".to_string(),
        log_queries: true,
        datasource_overrides: BTreeMap::default(),
        env: serde_json::json!({}),
        config_dir: PathBuf::from_str(CONFIG_DIR)?,
        ignore_env_var_errors: false,
        engine_protocol: Some(EngineProtocol::Json),
    };
    let engine = super::engine_import::QueryEngine::new(conf)
        .with_context(|| format!("Error while registering engine {engine_name}"))?;
    // do not check connection here as on typegate reload this could crash the whole system
    ctx.engines.insert(engine_name, engine);
    Ok(())
}

pub async fn query(
    ctx: &super::Ctx,
    engine_name: String,
    query: serde_json::Value,
) -> Result<String> {
    let engine = ctx
        .engines
        .get(&engine_name)
        .with_context(|| format!("Could not find engine '{engine_name}"))?;
    if !engine.is_connected().await {
        // lazy connection, will eventually have to be moved to inner helpers
        engine
            .connect()
            .await
            .with_context(|| format!("Error while connecting engine {engine_name}"))?;
    }
    let res = engine.query(serde_json::to_string(&query)?, None).await?;
    Ok(res)
}
