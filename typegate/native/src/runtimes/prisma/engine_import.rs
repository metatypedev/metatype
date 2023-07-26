// no-auto-license-header

// Copyright 2019 Prisma Data, Inc.
// Modifications copyright Metatype OÜ
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

use core::fmt;
use std::{collections::BTreeMap, sync::RwLock};
use tracing::{
    field::{Field, Visit},
    level_filters::LevelFilter,
    Level,
};

use futures::FutureExt;
use psl::diagnostics::Diagnostics;
use psl::PreviewFeature;
use query_connector::error::ConnectorError;
use query_core::CoreError;
use query_core::{
    protocol::EngineProtocol,
    schema::{self, QuerySchema},
    QueryExecutor, TransactionOptions, TxId,
};
use query_engine_metrics::MetricFormat;

type Result<T> = std::result::Result<T, ApiError>;
type Executor = Box<dyn query_core::QueryExecutor + Send + Sync>;

/// The main query engine used by JS
pub struct QueryEngine {
    inner: RwLock<Inner>,
    // logger: Logger,
}

/// The state of the engine.
pub enum Inner {
    /// Not connected, holding all data to form a connection.
    Builder(EngineBuilder),
    /// A connected engine, holding all data to disconnect and form a new
    /// connection. Allows querying when on this state.
    Connected(ConnectedEngine),
}

/// Everything needed to connect to the database and have the core running.
pub struct EngineBuilder {
    schema: Arc<psl::ValidatedSchema>,
    config_dir: PathBuf,
    env: HashMap<String, String>,
    engine_protocol: EngineProtocol,
}

/// Internal structure for querying and reconnecting with the engine.
pub struct ConnectedEngine {
    schema: Arc<psl::ValidatedSchema>,
    query_schema: Arc<QuerySchema>,
    executor: Executor,
    config_dir: PathBuf,
    env: HashMap<String, String>,
    // metrics: Option<MetricRegistry>,
    engine_protocol: EngineProtocol,
}

/// Returned from the `serverInfo` method in javascript.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerInfo {
    commit: String,
    version: String,
    primary_connector: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricOptions {
    format: MetricFormat,
    #[serde(default)]
    global_labels: HashMap<String, String>,
}

impl MetricOptions {
    fn is_json_format(&self) -> bool {
        self.format == MetricFormat::Json
    }
}

impl ConnectedEngine {
    /// The schema AST for Query Engine core.
    pub fn query_schema(&self) -> &Arc<QuerySchema> {
        &self.query_schema
    }

    /// The query executor.
    pub fn executor(&self) -> &(dyn QueryExecutor + Send + Sync) {
        self.executor.as_ref()
    }

    pub fn engine_protocol(&self) -> EngineProtocol {
        self.engine_protocol
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
    pub config_dir: PathBuf,
    #[serde(default)]
    pub ignore_env_var_errors: bool,
    #[serde(default)]
    pub engine_protocol: Option<EngineProtocol>,
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

impl QueryEngine {
    /// Parse a validated datamodel and configuration to allow connecting later on.
    /// Note: any new method added to this struct should be added to
    /// `query_engine_node_api::node_drivers::engine::QueryEngineNodeDrivers` as well.
    /// Unfortunately the `#[napi]` macro does not support deriving traits.
    pub fn new(
        // napi_env: Env,
        // options: JsUnknown,
        options: ConstructorOptions,
        // callback: JsFunction,
        // maybe_driver: Option<JsObject>,
    ) -> Result<Self> {
        // let log_callback = LogCallback::new(napi_env, callback)?;
        // log_callback.unref(&napi_env)?;

        #[cfg(feature = "js-drivers")]
        if let Some(driver) = maybe_driver {
            let queryable = js_drivers::JsQueryable::from(driver);
            sql_connector::register_driver(Arc::new(queryable));
        }

        let ConstructorOptions {
            datamodel,
            log_level,
            log_queries,
            datasource_overrides,
            env,
            config_dir,
            ignore_env_var_errors,
            engine_protocol,
        } = options;

        let env = stringify_env_values(env)?; // we cannot trust anything JS sends us from process.env
        let overrides: Vec<(_, _)> = datasource_overrides.into_iter().collect();
        let mut schema = psl::validate(datamodel.into());
        let config = &mut schema.configuration;

        schema
            .diagnostics
            .to_result()
            .map_err(|err| ApiError::conversion(err, schema.db.source()))?;

        config
            .resolve_datasource_urls_query_engine(
                &overrides,
                |key| env.get(key).map(ToString::to_string),
                ignore_env_var_errors,
            )
            .map_err(|err| ApiError::conversion(err, schema.db.source()))?;

        config
            .validate_that_one_datasource_is_provided()
            .map_err(|errors| ApiError::conversion(errors, schema.db.source()))?;

        let enable_metrics = config.preview_features().contains(PreviewFeature::Metrics);
        let enable_tracing = config.preview_features().contains(PreviewFeature::Tracing);
        let engine_protocol = engine_protocol.unwrap_or(EngineProtocol::Json);

        let builder = EngineBuilder {
            schema: Arc::new(schema),
            config_dir,
            engine_protocol,
            env,
        };

        let log_level = log_level.parse::<LevelFilter>().unwrap();
        // let logger = Logger::new(
        //     log_queries,
        //     log_level,
        //     log_callback,
        //     enable_metrics,
        //     enable_tracing,
        // );

        // Describe metrics adds all the descriptions and default values for our metrics
        // this needs to run once our metrics pipeline has been configured and it needs to
        // use the correct logging subscriber(our dispatch) so that the metrics recorder recieves
        // it
        // if enable_metrics {
        //     napi_env.execute_tokio_future(
        //         async {
        //             query_engine_metrics::describe_metrics();
        //             Ok(())
        //         }
        //         .with_subscriber(logger.dispatcher()),
        //         |&mut _env, _data| Ok(()),
        //     )?;
        // }

        Ok(Self {
            inner: RwLock::new(Inner::Builder(builder)),
            // logger,
        })
    }

    /// Connect to the database, allow queries to be run.
    pub async fn connect(&self) -> Result<()> {
        // let dispatcher = self.logger.dispatcher();

        async_panic_to_error(async {
            let span = tracing::info_span!("prisma:engine:connect");
            // let _ = telemetry::helpers::set_parent_context_from_json_str(&span, &trace);

            let mut inner = self.inner.write().await;
            let builder = inner.as_builder()?;
            let arced_schema = Arc::clone(&builder.schema);
            let arced_schema_2 = Arc::clone(&builder.schema);

            let url = {
                let data_source = builder
                    .schema
                    .configuration
                    .datasources
                    .first()
                    .ok_or_else(|| ApiError::configuration("No valid data source found"))?;
                data_source
                    .load_url_with_config_dir(&builder.config_dir, |key| {
                        builder.env.get(key).map(ToString::to_string)
                    })
                    .map_err(|err| {
                        ApiError::Conversion(err, builder.schema.db.source().to_owned())
                    })?
            };

            let engine = async move {
                // We only support one data source & generator at the moment, so take the first one (default not exposed yet).
                let data_source = arced_schema
                    .configuration
                    .datasources
                    .first()
                    .ok_or_else(|| ApiError::configuration("No valid data source found"))?;

                let preview_features = arced_schema.configuration.preview_features();

                let executor_fut = async {
                    let executor = load_executor(data_source, preview_features, &url).await?;
                    let connector = executor.primary_connector();

                    let conn_span = tracing::info_span!(
                        "prisma:engine:connection",
                        user_facing = true,
                        "db.type" = connector.name(),
                    );

                    connector.get_connection().instrument(conn_span).await?;

                    Result::<_>::Ok(executor)
                };

                let query_schema_span = tracing::info_span!("prisma:engine:schema");
                let query_schema_fut = tokio::runtime::Handle::current()
                    .spawn_blocking(move || {
                        let enable_raw_queries = true;
                        schema::build(arced_schema_2, enable_raw_queries)
                    })
                    .instrument(query_schema_span);

                let (query_schema, executor) = tokio::join!(query_schema_fut, executor_fut);

                Ok(ConnectedEngine {
                    schema: builder.schema.clone(),
                    query_schema: Arc::new(query_schema.unwrap()),
                    executor: executor?,
                    config_dir: builder.config_dir.clone(),
                    env: builder.env.clone(),
                    // metrics: self.logger.metrics(),
                    engine_protocol: builder.engine_protocol,
                }) as Result<ConnectedEngine>
            }
            .instrument(span)
            .await?;

            *inner = Inner::Connected(engine);

            Ok(())
        })
        // .with_subscriber(dispatcher)
        .await?;

        Ok(())
    }

    /// Disconnect and drop the core. Can be reconnected later with `#connect`.
    pub async fn disconnect(&self, trace: String) -> Result<()> {
        // let dispatcher = self.logger.dispatcher();

        async_panic_to_error(async {
            let span = tracing::info_span!("prisma:engine:disconnect");
            // let _ = telemetry::helpers::set_parent_context_from_json_str(&span, &trace);

            // TODO: when using Node Drivers, we need to call Driver::close() here.

            async {
                let mut inner = self.inner.write().await;
                let engine = inner.as_engine()?;

                let builder = EngineBuilder {
                    schema: engine.schema.clone(),
                    config_dir: engine.config_dir.clone(),
                    env: engine.env.clone(),
                    engine_protocol: engine.engine_protocol(),
                };

                *inner = Inner::Builder(builder);

                Ok(())
            }
            .instrument(span)
            .await
        })
        // .with_subscriber(dispatcher)
        .await
    }

    /// If connected, sends a query to the core and returns the response.
    pub async fn query(
        &self,
        body: String,
        // trace: String,
        tx_id: Option<String>,
    ) -> Result<String> {
        async_panic_to_error(async {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            let query = RequestBody::try_from_str(&body, engine.engine_protocol())?;

            // let dispatcher = self.logger.dispatcher();

            async move {
                let span = if tx_id.is_none() {
                    tracing::info_span!("prisma:engine", user_facing = true)
                } else {
                    Span::none()
                };

                // let trace_id = telemetry::helpers::set_parent_context_from_json_str(&span, &trace);

                let handler = RequestHandler::new(
                    engine.executor(),
                    engine.query_schema(),
                    engine.engine_protocol(),
                );
                let response = handler
                    .handle(query, tx_id.map(TxId::from), None)
                    .instrument(span)
                    .await;

                Ok(serde_json::to_string(&response)?)
            }
            // .with_subscriber(dispatcher)
            .await
        })
        .await
    }

    /// If connected, attempts to start a transaction in the core and returns its ID.
    pub async fn start_transaction(&self, input: String, trace: String) -> Result<String> {
        async_panic_to_error(async {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            // let dispatcher = self.logger.dispatcher();

            async move {
                let span = tracing::info_span!(
                    "prisma:engine:itx_runner",
                    user_facing = true,
                    itx_id = field::Empty
                );
                // telemetry::helpers::set_parent_context_from_json_str(&span, &trace);

                let tx_opts: TransactionOptions = serde_json::from_str(&input)?;
                match engine
                    .executor()
                    .start_tx(
                        engine.query_schema().clone(),
                        engine.engine_protocol(),
                        tx_opts,
                    )
                    .instrument(span)
                    .await
                {
                    Ok(tx_id) => Ok(json!({ "id": tx_id.to_string() }).to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            // .with_subscriber(dispatcher)
            .await
        })
        .await
    }

    /// If connected, attempts to commit a transaction with id `tx_id` in the core.
    pub async fn commit_transaction(&self, tx_id: String, _trace: String) -> Result<String> {
        async_panic_to_error(async {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            // let dispatcher = self.logger.dispatcher();

            async move {
                match engine.executor().commit_tx(TxId::from(tx_id)).await {
                    Ok(_) => Ok("{}".to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            // .with_subscriber(dispatcher)
            .await
        })
        .await
    }

    pub async fn dmmf(&self, trace: String) -> Result<String> {
        async_panic_to_error(async {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            // TODO
            Ok("".to_string())

            // let dispatcher = self.logger.dispatcher();

            // tracing::dispatcher::with_default(&dispatcher, || {
            //     let span = tracing::info_span!("prisma:engine:dmmf");
            //     let _ = telemetry::helpers::set_parent_context_from_json_str(&span, &trace);
            //     let _guard = span.enter();
            //     let dmmf = dmmf::render_dmmf(&engine.query_schema);
            //
            //     let json = {
            //         let _span = tracing::info_span!("prisma:engine:dmmf_to_json").entered();
            //         serde_json::to_string(&dmmf)?
            //     };
            //
            //     Ok(json)
            // })
        })
        .await
    }

    /// If connected, attempts to roll back a transaction with id `tx_id` in the core.
    pub async fn rollback_transaction(&self, tx_id: String, _trace: String) -> Result<String> {
        async_panic_to_error(async {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            // let dispatcher = self.logger.dispatcher();

            async move {
                match engine.executor().rollback_tx(TxId::from(tx_id)).await {
                    Ok(_) => Ok("{}".to_string()),
                    Err(err) => Ok(map_known_error(err)?),
                }
            }
            // .with_subscriber(dispatcher)
            .await
        })
        .await
    }

    /// Loads the query schema. Only available when connected.
    pub async fn sdl_schema(&self) -> Result<String> {
        async_panic_to_error(async move {
            let inner = self.inner.read().await;
            let engine = inner.as_engine()?;

            Ok(render_graphql_schema(engine.query_schema()))
        })
        .await
    }

    // pub async fn metrics(&self, json_options: String) -> Result<String> {
    //     async_panic_to_error(async move {
    //         let inner = self.inner.read().await;
    //         let engine = inner.as_engine()?;
    //         let options: MetricOptions = serde_json::from_str(&json_options)?;
    //
    //         if let Some(metrics) = &engine.metrics {
    //             if options.is_json_format() {
    //                 let engine_metrics = metrics.to_json(options.global_labels);
    //                 let res = serde_json::to_string(&engine_metrics)?;
    //                 Ok(res)
    //             } else {
    //                 Ok(metrics.to_prometheus(options.global_labels))
    //             }
    //         } else {
    //             Err(ApiError::Configuration(
    //                 "Metrics is not enabled. First set it in the preview features.".to_string(),
    //             )
    //             .into())
    //         }
    //     })
    //     .await
    // }
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

async fn async_panic_to_error<F, R>(fut: F) -> Result<R>
where
    F: Future<Output = Result<R>>,
{
    match AssertUnwindSafe(fut).catch_unwind().await {
        Ok(result) => result,
        Err(err) => match Error::extract_panic_message(err) {
            Some(message) => Err(ApiError::Panic(message)),
            None => Err(ApiError::Panic("unknown panic".to_string())),
        },
    }
}

// async fn async_panic_to_js_error<F, R>(fut: F) -> Result<R>
// where
//     F: Future<Output = Result<R>>,
// {
//     match AssertUnwindSafe(fut).catch_unwind().await {
//         Ok(result) => result,
//         Err(err) => match Error::extract_panic_message(err) {
//             Some(message) => Err(napi::Error::from_reason(format!("PANIC: {message}"))),
//             None => Err(napi::Error::from_reason("PANIC: unknown panic".to_string())),
//         },
//     }
// }

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

    // TODO
    #[error("{}", _0)]
    Panic(String),
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
        Self::configuration(format!("Error parsing connection string: {e}"))
    }
}

impl From<connection_string::Error> for ApiError {
    fn from(e: connection_string::Error) -> Self {
        Self::configuration(format!("Error parsing connection string: {e}"))
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(e: serde_json::Error) -> Self {
        Self::JsonDecode(format!("{e}"))
    }
}

// impl From<ApiError> for Error {
//     fn from(e: ApiError) -> Self {
//         let user_facing = user_facing_errors::Error::from(e);
//         let message = serde_json::to_string(&user_facing).unwrap();
//
//         Error::from_reason(message)
//     }
// }

// enum ThreadsafeFunctionState {
//     Active(napi_threadsafe_function),
//     Closing,
// }

// impl ThreadsafeFunctionState {
//     fn as_active(&self) -> Result<napi_threadsafe_function> {
//         match self {
//             ThreadsafeFunctionState::Active(tsfn) => Ok(*tsfn),
//             ThreadsafeFunctionState::Closing => Err(closing_error()),
//         }
//     }
// }
//
// pub struct LogCallback {
//     state: Arc<Mutex<ThreadsafeFunctionState>>,
// }
//
// impl LogCallback {
//     pub fn new(env: Env, function: JsFunction) -> Result<Self> {
//         let name = env.create_string("prisma log callback")?;
//         let state = Arc::new(Mutex::new(ThreadsafeFunctionState::Closing));
//         let mut tsfn = std::ptr::null_mut();
//         let status = unsafe {
//             napi_create_threadsafe_function(
//                 env.raw(),
//                 function.raw(),
//                 std::ptr::null_mut(),
//                 name.raw(),
//                 0,
//                 1,
//                 Arc::into_raw(Arc::clone(&state)) as *mut c_void,
//                 Some(finalize_callback),
//                 std::ptr::null_mut(),
//                 Some(call_js),
//                 &mut tsfn,
//             )
//         };
//
//         match status {
//             Status::napi_ok => {
//                 *(state.lock().unwrap()) = ThreadsafeFunctionState::Active(tsfn);
//                 Ok(Self { state })
//             }
//
//             _ => Err(napi::Error::new(
//                 napi::Status::from(status),
//                 "could not create threadsafe function".to_string(),
//             )),
//         }
//     }
//
//     pub fn unref(&self, env: &Env) -> Result<()> {
//         let mut tsfn_state = self.state.lock().unwrap();
//         let tsfn = tsfn_state.as_active()?;
//
//         let status = unsafe { napi_unref_threadsafe_function(env.raw(), tsfn) };
//
//         check_status_and_close(status, &mut tsfn_state)
//     }
//
//     pub fn call(&self, value: String) -> Result<()> {
//         let mut tsfn_state = self.state.lock().unwrap();
//
//         let tsfn = tsfn_state.as_active()?;
//
//         let data = Box::into_raw(Box::new(value));
//         let status = unsafe {
//             napi_call_threadsafe_function(tsfn, data.cast(), ThreadsafeFunctionCallMode::blocking)
//         };
//
//         check_status_and_close(status, &mut tsfn_state)
//     }
// }
//
// impl Drop for LogCallback {
//     fn drop(&mut self) {
//         let state = self.state.lock().unwrap();
//         if let ThreadsafeFunctionState::Active(tsfn) = &*state {
//             unsafe {
//                 napi_release_threadsafe_function(*tsfn, ThreadsafeFunctionReleaseMode::release);
//             }
//         }
//     }
// }
//
// unsafe impl Send for LogCallback {}
// unsafe impl Sync for LogCallback {}

// fn check_status_and_close(status: i32, tsfn_state: &mut ThreadsafeFunctionState) -> Result<()> {
//     match status {
//         Status::napi_ok => Ok(()),
//         Status::napi_closing => {
//             *tsfn_state = ThreadsafeFunctionState::Closing;
//             Err(closing_error())
//         }
//
//         _ => Err(napi::Error::from_status(napi::Status::from(status))),
//     }
// }
//
// fn closing_error() -> napi::Error {
//     napi::Error::new(napi::Status::Closing, "callback is closing".to_string())
// }

// unsafe extern "C" fn finalize_callback(
//     _raw_env: napi::sys::napi_env,
//     finalize_data: *mut c_void,
//     _finalize_hint: *mut c_void,
// ) {
//     let state: Arc<Mutex<ThreadsafeFunctionState>> = Arc::from_raw(finalize_data.cast());
//     let mut state = state.lock().unwrap();
//     *state = ThreadsafeFunctionState::Closing;
// }
//
// unsafe extern "C" fn call_js(
//     raw_env: napi_env,
//     js_callback: napi_value,
//     _context: *mut c_void,
//     data: *mut c_void,
// ) {
//     let value: Box<String> = Box::from_raw(data.cast());
//     let env = Env::from_raw(raw_env);
//     let _ = JsFunction::from_raw(raw_env, js_callback).map(|func| {
//         let _ = env
//             .create_string(&value)
//             .map(|value| func.call(None, &[value]));
//     });
// }

// pub(crate) struct Logger {
//     dispatcher: Dispatch,
//     metrics: Option<MetricRegistry>,
// }
//
// impl Logger {
//     /// Creates a new logger using a call layer
//     pub fn new(
//         log_queries: bool,
//         log_level: LevelFilter,
//         // log_callback: LogCallback,
//         enable_metrics: bool,
//         enable_tracing: bool,
//     ) -> Self {
//         let is_sql_query = filter_fn(|meta| {
//             meta.target() == "quaint::connector::metrics"
//                 && meta.fields().iter().any(|f| f.name() == "query")
//         });
//
//         // is a mongodb query?
//         let is_mongo_query = filter_fn(|meta| meta.target() == "mongodb_query_connector::query");
//
//         // We need to filter the messages to send to our callback logging mechanism
//         let filters = if log_queries {
//             // Filter trace query events (for query log) or based in the defined log level
//             is_sql_query.or(is_mongo_query).or(log_level).boxed()
//         } else {
//             // Filter based in the defined log level
//             FilterExt::boxed(log_level)
//         };
//
//         // let log_callback_arc = Arc::new(log_callback);
//         let is_user_trace = filter_fn(telemetry::helpers::user_facing_span_only_filter);
//         let tracer = new_pipeline().install_simple(Arc::clone(&log_callback_arc));
//         let telemetry = if enable_tracing {
//             let telemetry = tracing_opentelemetry::layer()
//                 .with_tracer(tracer)
//                 .with_filter(is_user_trace);
//             Some(telemetry)
//         } else {
//             None
//         };
//
//         let layer = CallbackLayer::new(log_callback_arc).with_filter(filters);
//
//         let metrics = if enable_metrics {
//             query_engine_metrics::setup();
//             Some(MetricRegistry::new())
//         } else {
//             None
//         };
//
//         Self {
//             dispatcher: Dispatch::new(
//                 Registry::default()
//                     .with(telemetry)
//                     .with(layer)
//                     .with(metrics.clone()),
//             ),
//             metrics,
//         }
//     }
//
//     pub fn dispatcher(&self) -> Dispatch {
//         self.dispatcher.clone()
//     }
//
//     pub fn metrics(&self) -> Option<MetricRegistry> {
//         self.metrics.clone()
//     }
// }

pub struct JsonVisitor<'a> {
    values: BTreeMap<&'a str, serde_json::Value>,
}

impl<'a> JsonVisitor<'a> {
    pub fn new(level: &Level, target: &str) -> Self {
        let mut values = BTreeMap::new();
        values.insert("level", serde_json::Value::from(level.to_string()));

        // NOTE: previous version used module_path, this is not correct and it should be _target_
        values.insert("module_path", serde_json::Value::from(target));

        JsonVisitor { values }
    }
}

impl<'a> Visit for JsonVisitor<'a> {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        match field.name() {
            name if name.starts_with("r#") => {
                self.values
                    .insert(&name[2..], serde_json::Value::from(format!("{value:?}")));
            }
            name => {
                self.values
                    .insert(name, serde_json::Value::from(format!("{value:?}")));
            }
        };
    }

    fn record_i64(&mut self, field: &Field, value: i64) {
        self.values
            .insert(field.name(), serde_json::Value::from(value));
    }

    fn record_u64(&mut self, field: &Field, value: u64) {
        self.values
            .insert(field.name(), serde_json::Value::from(value));
    }

    fn record_bool(&mut self, field: &Field, value: bool) {
        self.values
            .insert(field.name(), serde_json::Value::from(value));
    }

    fn record_str(&mut self, field: &Field, value: &str) {
        self.values
            .insert(field.name(), serde_json::Value::from(value));
    }
}

impl<'a> ToString for JsonVisitor<'a> {
    fn to_string(&self) -> String {
        serde_json::to_string(&self.values).unwrap()
    }
}

// pub(crate) struct CallbackLayer {
//     callback: Arc<LogCallback>,
// }

// impl CallbackLayer {
//     pub fn new(callback: Arc<LogCallback>) -> Self {
//         CallbackLayer { callback }
//     }
// }
//
// // A tracing layer for sending logs to a js callback, layers are composable, subscribers are not.
// impl<S: Subscriber> Layer<S> for CallbackLayer {
//     fn on_event(
//         &self,
//         event: &tracing::Event<'_>,
//         _ctx: tracing_subscriber::layer::Context<'_, S>,
//     ) {
//         let mut visitor = JsonVisitor::new(event.metadata().level(), event.metadata().target());
//         event.record(&mut visitor);
//
//         let _ = self.callback.call(visitor.to_string());
//     }
// }

// tracer.rs
// /// Pipeline builder
// #[derive(Debug)]
// pub struct PipelineBuilder {
//     trace_config: Option<sdk::trace::Config>,
// }

// /// Create a new stdout exporter pipeline builder.
// pub fn new_pipeline() -> PipelineBuilder {
//     PipelineBuilder::default()
// }
//
// impl Default for PipelineBuilder {
//     /// Return the default pipeline builder.
//     fn default() -> Self {
//         Self { trace_config: None }
//     }
// }
//
// impl PipelineBuilder {
//     /// Assign the SDK trace configuration.
//     #[allow(dead_code)]
//     pub fn with_trace_config(mut self, config: sdk::trace::Config) -> Self {
//         self.trace_config = Some(config);
//         self
//     }
// }
//
// impl PipelineBuilder {
//     pub fn install_simple(mut self, log_callback: Arc<LogCallback>) -> sdk::trace::Tracer {
//         global::set_text_map_propagator(TraceContextPropagator::new());
//         let exporter = ClientSpanExporter::new(log_callback);
//
//         let mut provider_builder =
//             sdk::trace::TracerProvider::builder().with_simple_exporter(exporter);
//         // This doesn't work at the moment because we create the logger outside of an async runtime
//         // we could later move the creation of logger into the `connect` function
//         // let mut provider_builder = sdk::trace::TracerProvider::builder().with_batch_exporter(exporter, runtime::Tokio);
//         // remember to add features = ["rt-tokio"] to the cargo.toml
//         if let Some(config) = self.trace_config.take() {
//             provider_builder = provider_builder.with_config(config);
//         }
//         let provider = provider_builder.build();
//         let tracer = provider.tracer("opentelemetry");
//         global::set_tracer_provider(provider);
//
//         tracer
//     }
// }
//
// /// A [`ClientSpanExporter`] that sends spans to the JS callback.
// pub struct ClientSpanExporter {
//     callback: Arc<LogCallback>,
// }
//
// impl ClientSpanExporter {
//     pub fn new(callback: Arc<LogCallback>) -> Self {
//         Self { callback }
//     }
// }
//
// impl Debug for ClientSpanExporter {
//     fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
//         f.debug_struct("ClientSpanExporter").finish()
//     }
// }
//
// #[async_trait]
// impl SpanExporter for ClientSpanExporter {
//     /// Export spans to stdout
//     async fn export(&mut self, batch: Vec<SpanData>) -> ExportResult {
//         let result = telemetry::helpers::spans_to_json(batch);
//         self.callback
//             .call(result)
//             .map_err(|err| TraceError::from(format!("Could not call JS callback: {}", &err.reason)))
//     }
// }
