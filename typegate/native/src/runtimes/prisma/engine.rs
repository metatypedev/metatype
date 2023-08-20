// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use anyhow::{Context, Result};
use query_core::protocol::EngineProtocol;

pub async fn register_engine(datamodel: String, engine_name: String) -> Result<()> {
    let conf = super::engine_import::ConstructorOptions {
        datamodel,
        log_level: "info".to_string(),
        log_queries: true,
        datasource_overrides: BTreeMap::default(),
        env: serde_json::json!({}),
        config_dir: PathBuf::from_str(".")?,
        ignore_env_var_errors: false,
        engine_protocol: Some(EngineProtocol::Json),
    };
    let engine = super::engine_import::QueryEngine::new(conf)
        .with_context(|| format!("Error while registering engine {engine_name}"))?;
    // do not check connection here as on typegate reload this could crash the whole system
    super::ENGINES.insert(engine_name, engine);
    Ok(())
}

pub async fn query(engine_name: String, query: serde_json::Value) -> Result<String> {
    let engine = super::ENGINES
        .get(&engine_name)
        .with_context(|| format!("Cound not find engine '{engine_name}"))?;
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
