// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use anyhow::{Context, Result};

pub async fn register_engine(datamodel: String, tg_name: String) -> Result<String> {
    let conf = super::engine_import::ConstructorOptions {
        datamodel,
        log_level: "info".to_string(),
        log_queries: true,
        datasource_overrides: BTreeMap::default(),
        env: serde_json::json!({}),
        config_dir: PathBuf::from_str(".")?,
        ignore_env_var_errors: false,
    };
    let engine = super::engine_import::QueryEngine::new(conf)
        .with_context(|| format!("Error while registering engine for typegraph {tg_name}"))?;
    engine.connect().await?;
    let engine_id = format!("{tg_name}_{}", super::ENGINES.len() + 1);
    super::ENGINES.insert(engine_id.clone(), engine);
    Ok(engine_id)
}

pub async fn query(engine_key: String, query: serde_json::Value) -> Result<String> {
    let body = serde_json::from_value(query)?;
    let engine = super::ENGINES
        .get(&engine_key)
        .with_context(|| format!("Cound not find engine '{engine_key}"))?;
    let res = engine.query(body, None).await?;
    serde_json::to_string(&res)
        .context("Error while deserializing GraphQL response from the prisma engine")
}
