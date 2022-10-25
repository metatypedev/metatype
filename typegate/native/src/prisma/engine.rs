// no-auto-license-header

// Copyright 2019 Prisma Data, Inc.
// Modifications copyright 2022 Metatype
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.

// https://github.com/prisma/prisma-engines/blob/main/query-engine/query-engine-node-api/src/engine.rs

use prisma_models::psl;
use prisma_models::psl::datamodel_connector::RelationMode;
use psl::diagnostics::Diagnostics;
use query_connector::error::ConnectorError;
use query_core::CoreError;
use query_core::{
    executor,
    schema::{QuerySchema, QuerySchemaRenderer},
    schema_builder, QueryExecutor, TxId,
};
use request_handlers::{
    GraphQLSchemaRenderer, GraphQlBody, GraphQlHandler, PrismaResponse, TxInput,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    collections::{BTreeMap, HashMap},
    path::PathBuf,
    sync::Arc,
};
use thiserror::Error;
use tokio::sync::RwLock;

/// The main engine, that can be cloned between threads when using JavaScript
/// promises.
#[derive(Clone)]
pub struct QueryEngine {
    inner: Arc<RwLock<Inner>>,
}

type Executor = Box<dyn query_core::QueryExecutor + Send + Sync>;
type Result<T> = std::result::Result<T, ApiError>;

/// The state of the engine.
pub enum Inner {
    /// Not connected, holding all data to form a connection.
    Builder(EngineBuilder),
    /// A connected engine, holding all data to disconnect and form a new
    /// connection. Allows querying when on this state.
    Connected(ConnectedEngine),
}

impl Inner {
    /// Returns a builder if the engine is not connected
    fn as_builder(&self) -> Result<&EngineBuilder> {
        match self {
            Inner::Builder(ref builder) => Ok(builder),
            Inner::Connected(_) => Err(ApiError::AlreadyConnected),
        }
    }

    /// Returns the engine if connected
    fn as_engine(&self) -> Result<&ConnectedEngine> {
        match self {
            Inner::Builder(_) => Err(ApiError::NotConnected),
            Inner::Connected(ref engine) => Ok(engine),
        }
    }
}

/// Everything needed to connect to the database and have the core running.
pub struct EngineBuilder {
    schema: Arc<psl::ValidatedSchema>,
    config_dir: PathBuf,
    env: HashMap<String, String>,
}

/// Internal structure for querying and reconnecting with the engine.
pub struct ConnectedEngine {
    schema: Arc<psl::ValidatedSchema>,
    query_schema: Arc<QuerySchema>,
    executor: Executor,
    config_dir: PathBuf,
    env: HashMap<String, String>,
}

/// Returned from the `serverInfo` method in javascript.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    commit: String,
    version: String,
    primary_connector: Option<String>,
}

impl ConnectedEngine {
    /// The schema AST for Query Engine core.
    pub fn query_schema(&self) -> &Arc<QuerySchema> {
        &self.query_schema
    }

    /// The query executor.
    pub fn executor(&self) -> &(dyn QueryExecutor + Send + Sync) {
        &*self.executor
    }
}

/// Parameters defining the construction of an engine.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConstructorOptions {
    pub datamodel: String,
    pub log_level: String,
    #[serde(default)]
    pub log_queries: bool,
    #[serde(default)]
    pub datasource_overrides: BTreeMap<String, String>,
    #[serde(default)]
    pub env: serde_json::Value,
    #[serde(default)]
    pub config_dir: PathBuf,
    #[serde(default)]
    pub ignore_env_var_errors: bool,
}

impl QueryEngine {
    /// Parse a validated datamodel and configuration to allow connecting later on.
    pub fn new(opts: ConstructorOptions) -> Result<Self> {
        let ConstructorOptions {
            datamodel,
            log_level: _,
            log_queries: _,
            datasource_overrides,
            env,
            config_dir,
            ignore_env_var_errors,
        } = opts;

        let env = stringify_env_values(env)?; // we cannot trust anything JS sends us from process.env
        let overrides: Vec<(_, _)> = datasource_overrides.into_iter().collect();
        let mut schema = psl::validate(datamodel.into());
        let config = &mut schema.configuration;

        schema
            .diagnostics
            .to_result()
            .map_err(|err| ApiError::conversion(err, schema.db.source()))?;

        if !ignore_env_var_errors {
            config
                .resolve_datasource_urls_from_env(&overrides, |key| {
                    env.get(key).map(ToString::to_string)
                })
                .map_err(|err| ApiError::conversion(err, schema.db.source()))?;
        }

        config
            .validate_that_one_datasource_is_provided()
            .map_err(|errors| ApiError::conversion(errors, schema.db.source()))?;

        let builder = EngineBuilder {
            schema: Arc::new(schema),
            config_dir,
            env,
        };

        Ok(Self {
            inner: Arc::new(RwLock::new(Inner::Builder(builder))),
        })
    }

    /// Connect to the database, allow queries to be run.
    pub async fn connect(&self) -> Result<()> {
        let mut inner = self.inner.write().await;
        let builder = inner.as_builder()?;

        let engine = async move {
            // We only support one data source & generator at the moment, so take the first one (default not exposed yet).
            let data_source = builder
                .schema
                .configuration
                .datasources
                .first()
                .ok_or_else(|| ApiError::configuration("No valid data source found"))?;

            let preview_features: Vec<_> = builder
                .schema
                .configuration
                .preview_features()
                .iter()
                .collect();
            let url = data_source
                .load_url_with_config_dir(&builder.config_dir, |key| {
                    builder.env.get(key).map(ToString::to_string)
                })
                .map_err(|err| ApiError::Conversion(err, builder.schema.db.source().to_owned()))?;

            let (db_name, executor) = executor::load(data_source, &preview_features, &url).await?;
            let connector = executor.primary_connector();
            connector.get_connection().await?;

            // Build internal data model
            let internal_data_model = prisma_models::convert(&builder.schema, db_name);

            let query_schema = schema_builder::build(
                internal_data_model,
                true, // enable raw queries
                data_source.active_connector,
                preview_features,
                RelationMode::ForeignKeys,
            );

            Result::Ok(ConnectedEngine {
                schema: builder.schema.clone(),
                query_schema: Arc::new(query_schema),
                executor,
                config_dir: builder.config_dir.clone(),
                env: builder.env.clone(),
            })
        }
        .await?;

        *inner = Inner::Connected(engine);

        Ok(())
    }

    /// Disconnect and drop the core. Can be reconnected later with `#connect`.
    pub async fn disconnect(&self) -> Result<()> {
        let mut inner = self.inner.write().await;
        let engine = inner.as_engine()?;

        let builder = EngineBuilder {
            schema: engine.schema.clone(),
            config_dir: engine.config_dir.clone(),
            env: engine.env.clone(),
        };

        *inner = Inner::Builder(builder);

        Ok(())
    }

    /// If connected, sends a query to the core and returns the response.
    pub async fn query(&self, query: GraphQlBody, tx_id: Option<String>) -> Result<PrismaResponse> {
        match *self.inner.read().await {
            Inner::Connected(ref engine) => {
                let handler = GraphQlHandler::new(engine.executor(), engine.query_schema());
                Ok(handler.handle(query, tx_id.map(TxId::from), None).await)
            }
            Inner::Builder(_) => Err(ApiError::NotConnected),
        }
    }

    /// If connected, attempts to start a transaction in the core and returns its ID.
    pub async fn start_tx(&self, input: TxInput) -> Result<String> {
        match *self.inner.read().await {
            Inner::Connected(ref engine) => {
                match engine
                    .executor()
                    .start_tx(
                        engine.query_schema().clone(),
                        input.max_wait,
                        input.timeout,
                        None,
                    )
                    .await
                {
                    Ok(tx_id) => Ok(json!({ "id": tx_id.to_string() }).to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            Inner::Builder(_) => Err(ApiError::NotConnected),
        }
    }

    /// If connected, attempts to commit a transaction with id `tx_id` in the core.
    pub async fn commit_tx(&self, tx_id: String) -> Result<String> {
        match *self.inner.read().await {
            Inner::Connected(ref engine) => {
                match engine.executor().commit_tx(TxId::from(tx_id)).await {
                    Ok(_) => Ok("{}".to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            Inner::Builder(_) => Err(ApiError::NotConnected),
        }
    }

    /// If connected, attempts to roll back a transaction with id `tx_id` in the core.
    pub async fn rollback_tx(&self, tx_id: String) -> Result<String> {
        match *self.inner.read().await {
            Inner::Connected(ref engine) => {
                match engine.executor().rollback_tx(TxId::from(tx_id)).await {
                    Ok(_) => Ok("{}".to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            Inner::Builder(_) => Err(ApiError::NotConnected),
        }
    }

    /// Loads the query schema. Only available when connected.
    pub async fn sdl_schema(&self) -> Result<String> {
        match *self.inner.read().await {
            Inner::Connected(ref engine) => {
                Ok(GraphQLSchemaRenderer::render(engine.query_schema().clone()))
            }
            Inner::Builder(_) => Err(ApiError::NotConnected),
        }
    }
}

fn map_known_error(err: query_core::CoreError) -> Result<String> {
    let user_error: user_facing_errors::Error = err.into();
    let value = serde_json::to_string(&user_error)?;

    Ok(value)
}

fn stringify_env_values(origin: serde_json::Value) -> Result<HashMap<String, String>> {
    use serde_json::Value;

    let msg = match origin {
        Value::Object(map) => {
            let mut result: HashMap<String, String> = HashMap::new();

            for (key, val) in map.into_iter() {
                match val {
                    Value::Null => continue,
                    Value::String(val) => {
                        result.insert(key, val);
                    }
                    val => {
                        result.insert(key, val.to_string());
                    }
                }
            }

            return Ok(result);
        }
        Value::Null => return Ok(Default::default()),
        Value::Bool(_) => "Expected an object for the env constructor parameter, got a boolean.",
        Value::Number(_) => "Expected an object for the env constructor parameter, got a number.",
        Value::String(_) => "Expected an object for the env constructor parameter, got a string.",
        Value::Array(_) => "Expected an object for the env constructor parameter, got an array.",
    };

    Err(ApiError::JsonDecode(msg.to_string()))
}

#[derive(Debug, Error)]
pub enum ApiError {
    #[error("{:?}", _0)]
    Conversion(Diagnostics, String),

    #[error("{}", _0)]
    Configuration(String),

    #[error("{}", _0)]
    Core(CoreError),

    #[error("{}", _0)]
    Connector(ConnectorError),

    #[error("Can't modify an already connected engine.")]
    AlreadyConnected,

    #[error("Engine is not yet connected.")]
    NotConnected,

    #[error("{}", _0)]
    JsonDecode(String),
}

impl From<ApiError> for user_facing_errors::Error {
    fn from(err: ApiError) -> Self {
        use std::fmt::Write as _;

        match err {
            ApiError::Connector(ConnectorError {
                user_facing_error: Some(err),
                ..
            }) => err.into(),
            ApiError::Conversion(errors, dml_string) => {
                let mut full_error = errors.to_pretty_string("schema.prisma", &dml_string);
                write!(
                    full_error,
                    "\nValidation Error Count: {}",
                    errors.errors().len()
                )
                .unwrap();

                user_facing_errors::Error::from(user_facing_errors::KnownError::new(
                    user_facing_errors::common::SchemaParserError { full_error },
                ))
            }
            ApiError::Core(error) => user_facing_errors::Error::from(error),
            other => {
                user_facing_errors::Error::new_non_panic_with_current_backtrace(other.to_string())
            }
        }
    }
}

impl ApiError {
    pub fn conversion(diagnostics: Diagnostics, dml: impl ToString) -> Self {
        Self::Conversion(diagnostics, dml.to_string())
    }

    pub fn configuration(msg: impl ToString) -> Self {
        Self::Configuration(msg.to_string())
    }
}

impl From<CoreError> for ApiError {
    fn from(e: CoreError) -> Self {
        match e {
            CoreError::ConfigurationError(message) => Self::Configuration(message),
            core_error => Self::Core(core_error),
        }
    }
}

impl From<ConnectorError> for ApiError {
    fn from(e: ConnectorError) -> Self {
        Self::Connector(e)
    }
}

impl From<url::ParseError> for ApiError {
    fn from(e: url::ParseError) -> Self {
        Self::configuration(format!("Error parsing connection string: {}", e))
    }
}

impl From<connection_string::Error> for ApiError {
    fn from(e: connection_string::Error) -> Self {
        Self::configuration(format!("Error parsing connection string: {}", e))
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(e: serde_json::Error) -> Self {
        Self::JsonDecode(format!("{}", e))
    }
}
