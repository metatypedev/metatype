// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use std::{collections::BTreeMap, path::PathBuf, str::FromStr};

use anyhow::{Context, Result};
use request_handlers::GraphqlBody;

pub async fn register_engine(datamodel: String, engine_name: String) -> Result<()> {
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
        .with_context(|| format!("Error while registering engine {engine_name}"))?;
    engine.connect().await?;
    super::ENGINES.insert(engine_name, engine);
    Ok(())
}

pub async fn query(engine_name: String, query: serde_json::Value) -> Result<String> {
    let body = serde_json::from_value::<GraphqlBody>(query)?;
    let engine = super::ENGINES
        .get(&engine_name)
        .with_context(|| format!("Cound not find engine '{engine_name}"))?;
    let res = engine.query(body.into(), None).await?;
    serde_json::to_string(&res)
        .context("Error while deserializing GraphQL response from the prisma engine")
}
