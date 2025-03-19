// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::args::{PlaceholderValue, PreparedArgs};
use crate::common::*;
use crate::files::{File, FileExtractor};
use crate::interlude::*;
use crate::nodes::{SelectNodeErased, ToMutationDoc, ToQueryDoc, ToSelectDoc};
use std::sync::Arc;

#[derive(Default, Clone)]
pub struct GraphQlTransportOptions {
    pub headers: reqwest::header::HeaderMap,
    pub timeout: Option<std::time::Duration>,
}

// PlaceholderValue, fieldName -> gql_var_name
pub(crate) type FoundPlaceholders = Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>;

// enum GraphQLRequestBody {
//     Json(serde_json::Value),
//     Multipart(reqwest::multipart::Form),
// }
//
// struct GraphQLRequest {
//     addr: Url,
//     method: reqwest::Method,
//     headers: reqwest::header::HeaderMap,
//     body: GraphQLRequestBody,
// }

#[cfg(not(target_family = "wasm"))]
use reqwest::blocking::{Client as ClientSync, RequestBuilder as RequestBuilderSync};

#[cfg(not(target_family = "wasm"))]
pub(crate) fn build_gql_req_sync(
    client: &ClientSync,
    addr: Url,
    doc: &str,
    mut variables: JsonObject,
    path_to_files: HashMap<String, Vec<TypePath>>,
    opts: &GraphQlTransportOptions,
) -> Result<RequestBuilderSync, BuildReqError> {
    use reqwest::blocking::multipart::Form;

    let files = FileExtractor::extract_all_from(&mut variables, path_to_files)
        .map_err(|error| BuildReqError::FileUpload { error })?;

    let mut request = client.request(reqwest::Method::POST, addr);
    if let Some(timeout) = opts.timeout {
        request = request.timeout(timeout);
    }
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::ACCEPT,
        "application/json".try_into().unwrap(),
    );
    headers.extend(opts.headers.clone());

    let operations = serde_json::json!({
        "query": doc,
        "variables": variables
    });

    // TODO rename files

    if !files.is_empty() {
        // multipart
        let mut form = Form::new();

        form = form.text("operations", serde_json::to_string(&operations).unwrap());

        let (map, files): (HashMap<_, _>, Vec<_>) = files
            .into_iter()
            .enumerate()
            .map(|(idx, (path, file_id))| {
                (
                    (idx.to_string(), vec![format!("variables.{path}")]),
                    file_id,
                )
            })
            .unzip();

        form = form.text("map", serde_json::to_string(&map).unwrap());

        for (idx, file_id) in files.into_iter().enumerate() {
            let file: File = file_id
                .try_into()
                .map_err(|error| BuildReqError::FileUpload { error })?;
            form = form.part(
                idx.to_string(),
                file.try_into()
                    .map_err(|error| BuildReqError::FileUpload { error })?,
            );
        }

        Ok(request.headers(headers).multipart(form))
    } else {
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".try_into().unwrap(),
        );
        Ok(request.headers(headers).json(&operations))
    }
}

use reqwest::{Client, RequestBuilder, Url};
async fn build_gql_reqwest(
    client: &Client,
    addr: Url,
    doc: &str,
    mut variables: JsonObject,
    path_to_files: HashMap<String, Vec<TypePath>>,
    opts: &GraphQlTransportOptions,
) -> Result<RequestBuilder, BuildReqError> {
    use reqwest::multipart::Form;

    let files = FileExtractor::extract_all_from(&mut variables, path_to_files)
        .map_err(|error| BuildReqError::FileUpload { error })?;

    let request = client.request(reqwest::Method::POST, addr);
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::ACCEPT,
        "application/json".try_into().unwrap(),
    );
    headers.extend(opts.headers.clone());

    let operations = serde_json::json!({
        "query": doc,
        "variables": variables
    });

    if !files.is_empty() {
        // multipart
        let mut form = Form::new();

        form = form.text("operations", serde_json::to_string(&operations).unwrap());

        let (map, files): (HashMap<_, _>, Vec<_>) = files
            .into_iter()
            .enumerate()
            .map(|(idx, (path, file_id))| {
                (
                    (idx.to_string(), vec![format!("variables.{path}")]),
                    file_id,
                )
            })
            .unzip();

        form = form.text("map", serde_json::to_string(&map).unwrap());

        for (idx, file_id) in files.into_iter().enumerate() {
            let file: File = file_id
                .try_into()
                .map_err(|error| BuildReqError::FileUpload { error })?;
            form = form.part(
                idx.to_string(),
                file.into_reqwest_part()
                    .await
                    .map_err(|error| BuildReqError::FileUpload { error })?,
            );
        }

        Ok(request.headers(headers).multipart(form))
    } else {
        headers.insert(
            reqwest::header::CONTENT_TYPE,
            "application/json".try_into().unwrap(),
        );
        Ok(request.headers(headers).json(&operations))
    }
}

#[derive(Clone)]
#[cfg(not(target_family = "wasm"))]
pub struct GraphQlTransportReqwestSync {
    addr: Url,
    ty_to_gql_ty_map: TyToGqlTyMap,
    client: reqwest::blocking::Client,
}

#[derive(Clone)]
pub struct GraphQlTransportReqwest {
    addr: Url,
    ty_to_gql_ty_map: TyToGqlTyMap,
    client: reqwest::Client,
}

#[cfg(not(target_family = "wasm"))]
impl GraphQlTransportReqwestSync {
    pub fn new(addr: Url, ty_to_gql_ty_map: TyToGqlTyMap) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map,
            client: reqwest::blocking::Client::new(),
        }
    }

    fn fetch(
        &self,
        nodes: Vec<SelectNodeErased>,
        opts: &GraphQlTransportOptions,
        ty: &'static str,
    ) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
        let nodes_len = nodes.len();
        let GqlRequest {
            doc,
            variables,
            placeholders,
            path_to_files,
        } = GqlRequestBuilder::new(&self.ty_to_gql_ty_map).build(nodes, ty, None)?;
        if !placeholders.is_empty() {
            panic!("placeholders found in non-prepared query")
        }
        let req = build_gql_req_sync(
            &self.client,
            self.addr.clone(),
            &doc,
            variables,
            path_to_files,
            opts,
        )?;
        match req.send() {
            Ok(res) => {
                let status = res.status();
                match res.json::<JsonObject>() {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status_code: status.as_u16(),
                            body,
                        },
                        nodes_len,
                    ),
                    Err(error) => Err(GraphQLRequestError::BodyError {
                        error: Box::new(error),
                    }),
                }
            }
            Err(error) => Err(GraphQLRequestError::NetworkError {
                error: Box::new(error),
            }),
        }
    }

    pub fn query<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        self.query_with_opts(nodes, &Default::default())
    }

    pub fn query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
        opts: &GraphQlTransportOptions,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        let resp = self.fetch(nodes.to_select_doc(), opts, "query")?;
        let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
            error: Box::from(format!(
                "error deserializing response into output type: {err}"
            )),
        })?;
        Ok(resp)
    }

    pub fn mutation<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        nodes: Doc,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        self.mutation_with_opts(nodes, &Default::default())
    }

    pub fn mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        nodes: Doc,
        opts: &GraphQlTransportOptions,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        let resp = self.fetch(nodes.to_select_doc(), opts, "mutation")?;
        let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
            error: Box::from(format!(
                "error deserializing response into output type: {err}"
            )),
        })?;
        Ok(resp)
    }
    pub fn prepare_query<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError<GraphQLRequestError>> {
        self.prepare_query_with_opts(fun, Default::default())
    }

    pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError<GraphQLRequestError>> {
        PreparedRequestReqwestSync::new(
            fun,
            self.addr.clone(),
            opts,
            "query",
            &self.ty_to_gql_ty_map,
        )
    }

    pub fn prepare_mutation<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError<GraphQLRequestError>> {
        self.prepare_mutation_with_opts(fun, Default::default())
    }

    pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError<GraphQLRequestError>> {
        PreparedRequestReqwestSync::new(
            fun,
            self.addr.clone(),
            opts,
            "mutation",
            &self.ty_to_gql_ty_map,
        )
    }
}

impl GraphQlTransportReqwest {
    pub fn new(addr: Url, ty_to_gql_ty_map: TyToGqlTyMap) -> Self {
        Self {
            addr,
            ty_to_gql_ty_map,
            client: reqwest::Client::new(),
        }
    }

    async fn fetch(
        &self,
        nodes: Vec<SelectNodeErased>,
        opts: &GraphQlTransportOptions,
        ty: &'static str,
    ) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
        let nodes_len = nodes.len();
        let GqlRequest {
            doc,
            variables,
            placeholders,
            path_to_files,
        } = GqlRequestBuilder::new(&self.ty_to_gql_ty_map).build(nodes, ty, None)?;
        if !placeholders.is_empty() {
            panic!("placeholders found in non-prepared query")
        }

        let req = build_gql_reqwest(
            &self.client,
            self.addr.clone(),
            &doc,
            variables,
            path_to_files,
            opts,
        )
        .await?;
        match req.send().await {
            Ok(res) => {
                let status = res.status();
                match res.json::<JsonObject>().await {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status_code: status.as_u16(),
                            body,
                        },
                        nodes_len,
                    ),
                    Err(error) => Err(GraphQLRequestError::BodyError {
                        error: Box::new(error),
                    }),
                }
            }
            Err(error) => Err(GraphQLRequestError::NetworkError {
                error: Box::new(error),
            }),
        }
    }

    pub async fn query<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        self.query_with_opts(nodes, &Default::default()).await
    }

    pub async fn query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
        opts: &GraphQlTransportOptions,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        let resp = self.fetch(nodes.to_select_doc(), opts, "query").await?;
        let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
            error: Box::from(format!(
                "error deserializing response into output type: {err}"
            )),
        })?;
        Ok(resp)
    }

    pub async fn mutation<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        nodes: Doc,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        self.mutation_with_opts(nodes, &Default::default()).await
    }

    pub async fn mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        nodes: Doc,
        opts: &GraphQlTransportOptions,
    ) -> Result<Doc::Out, GraphQLRequestError> {
        let resp = self.fetch(nodes.to_select_doc(), opts, "mutation").await?;
        let resp = Doc::parse_response(resp).map_err(|err| GraphQLRequestError::BodyError {
            error: Box::from(format!(
                "error deserializing response into output type: {err}"
            )),
        })?;
        Ok(resp)
    }
    pub fn prepare_query<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError<GraphQLRequestError>> {
        self.prepare_query_with_opts(fun, Default::default())
    }

    pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError<GraphQLRequestError>> {
        PreparedRequestReqwest::new(
            fun,
            self.addr.clone(),
            opts,
            "query",
            &self.ty_to_gql_ty_map,
        )
    }

    pub fn prepare_mutation<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError<GraphQLRequestError>> {
        self.prepare_mutation_with_opts(fun, Default::default())
    }

    pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError<GraphQLRequestError>> {
        PreparedRequestReqwest::new(
            fun,
            self.addr.clone(),
            opts,
            "mutation",
            &self.ty_to_gql_ty_map,
        )
    }
}

pub(crate) fn resolve_prepared_variables<T>(
    placeholders: &FoundPlaceholders,
    mut inline_variables: JsonObject,
    mut args: HashMap<CowStr, serde_json::Value>,
) -> Result<JsonObject, PrepareRequestError<T>> {
    for (ph, key_map) in placeholders {
        let Some(value) = args.remove(&ph.key) else {
            return Err(PrepareRequestError::PlaceholderError(Box::from(format!(
                "no value found for placeholder expected under key '{}'",
                ph.key
            ))));
        };
        let value = (ph.fun)(value).map_err(|err| {
            PrepareRequestError::PlaceholderError(Box::from(format!(
                "error applying placeholder closure for value under key '{}': {err}",
                ph.key
            )))
        })?;
        let serde_json::Value::Object(mut value) = value else {
            unreachable!("placeholder closures must return structs");
        };
        for (key, var_key) in key_map {
            inline_variables.insert(
                var_key.clone().into(),
                value.remove(&key[..]).unwrap_or(serde_json::Value::Null),
            );
        }
    }
    Ok(inline_variables)
}

pub struct PreparedRequestReqwest<Out> {
    addr: Url,
    client: reqwest::Client,
    nodes_len: usize,
    pub doc: String,
    variables: JsonObject,
    path_to_files: HashMap<String, Vec<TypePath>>,
    opts: GraphQlTransportOptions,
    placeholders: Arc<FoundPlaceholders>,
    _phantom: PhantomData<Out>,
}

#[cfg(not(target_family = "wasm"))]
pub struct PreparedRequestReqwestSync<Doc> {
    addr: Url,
    client: reqwest::blocking::Client,
    nodes_len: usize,
    pub doc: String,
    variables: JsonObject,
    path_to_files: HashMap<String, Vec<TypePath>>,
    opts: GraphQlTransportOptions,
    placeholders: Arc<FoundPlaceholders>,
    _phantom: PhantomData<Doc>,
}

#[cfg(not(target_family = "wasm"))]
impl<Doc: ToSelectDoc> PreparedRequestReqwestSync<Doc> {
    fn new(
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        addr: Url,
        opts: GraphQlTransportOptions,
        ty: &'static str,
        ty_to_gql_ty_map: &TyToGqlTyMap,
    ) -> Result<Self, PrepareRequestError<GraphQLRequestError>> {
        let nodes = fun(&mut PreparedArgs);
        let nodes = nodes.to_select_doc();
        let nodes_len = nodes.len();
        let GqlRequest {
            doc,
            variables,
            placeholders,
            path_to_files,
        } = GqlRequestBuilder::new(ty_to_gql_ty_map)
            .build(nodes, ty, None)
            .map_err(PrepareRequestError::BuildError)?;
        Ok(Self {
            doc,
            variables,
            path_to_files,
            nodes_len,
            addr,
            client: reqwest::blocking::Client::new(),
            opts,
            placeholders: Arc::new(placeholders),
            _phantom: PhantomData,
        })
    }

    pub fn perform<K, V>(
        &self,
        args: impl Into<HashMap<K, V>>,
    ) -> Result<Doc::Out, PrepareRequestError<GraphQLRequestError>>
    where
        K: Into<CowStr>,
        V: serde::Serialize,
    {
        let args: HashMap<K, V> = args.into();
        let args = args
            .into_iter()
            .map(|(key, val)| (key.into(), to_json_value(val)))
            .collect();
        let variables =
            resolve_prepared_variables(&self.placeholders, self.variables.clone(), args)?;
        // TODO extract files from variables after resolution
        let req = build_gql_req_sync(
            &self.client,
            self.addr.clone(),
            &self.doc,
            variables,
            self.path_to_files.clone(),
            &self.opts,
        )?;
        let res = match req.send() {
            Ok(res) => {
                let status = res.status();
                match res.json::<JsonObject>() {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status_code: status.as_u16(),
                            body,
                        },
                        self.nodes_len,
                    )
                    .map_err(PrepareRequestError::RequestError)?,
                    Err(error) => {
                        return Err(PrepareRequestError::RequestError(
                            GraphQLRequestError::BodyError {
                                error: Box::new(error),
                            },
                        ))
                    }
                }
            }
            Err(error) => {
                return Err(PrepareRequestError::RequestError(
                    GraphQLRequestError::NetworkError {
                        error: Box::new(error),
                    },
                ))
            }
        };
        Doc::parse_response(res).map_err(|err| {
            PrepareRequestError::RequestError(GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })
        })
    }
}

impl<Doc: ToSelectDoc> PreparedRequestReqwest<Doc> {
    fn new(
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        addr: Url,
        opts: GraphQlTransportOptions,
        ty: &'static str,
        ty_to_gql_ty_map: &TyToGqlTyMap,
    ) -> Result<Self, PrepareRequestError<GraphQLRequestError>> {
        let nodes = fun(&mut PreparedArgs);
        let nodes = nodes.to_select_doc();
        let nodes_len = nodes.len();
        let GqlRequest {
            doc,
            variables,
            placeholders,
            path_to_files,
        } = GqlRequestBuilder::new(ty_to_gql_ty_map)
            .build(nodes, ty, None)
            .map_err(PrepareRequestError::BuildError)?;
        let placeholders = std::sync::Arc::new(placeholders);
        Ok(Self {
            doc,
            variables,
            path_to_files,
            nodes_len,
            addr,
            client: reqwest::Client::new(),
            opts,
            placeholders,
            _phantom: PhantomData,
        })
    }

    pub async fn perform<K, V>(
        &self,
        args: impl Into<HashMap<K, V>>,
    ) -> Result<Doc::Out, PrepareRequestError<GraphQLRequestError>>
    where
        K: Into<CowStr>,
        V: serde::Serialize,
    {
        let args: HashMap<K, V> = args.into();
        let args = args
            .into_iter()
            .map(|(key, val)| (key.into(), to_json_value(val)))
            .collect();
        let variables =
            resolve_prepared_variables(&self.placeholders, self.variables.clone(), args)?;
        // TODO extract files from variables
        let req = build_gql_reqwest(
            &self.client,
            self.addr.clone(),
            &self.doc,
            variables,
            self.path_to_files.clone(),
            &self.opts,
        )
        .await?;
        let res = match req.send().await {
            Ok(res) => {
                let status = res.status();
                // let headers = res.headers().clone();
                match res.json::<JsonObject>().await {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status_code: status.as_u16(),
                            // headers,
                            body,
                        },
                        self.nodes_len,
                    )
                    .map_err(PrepareRequestError::RequestError)?,
                    Err(error) => {
                        return Err(PrepareRequestError::RequestError(
                            GraphQLRequestError::BodyError {
                                error: Box::new(error),
                            },
                        ))
                    }
                }
            }
            Err(error) => {
                return Err(PrepareRequestError::RequestError(
                    GraphQLRequestError::NetworkError {
                        error: Box::new(error),
                    },
                ))
            }
        };
        Doc::parse_response(res).map_err(|err| {
            PrepareRequestError::RequestError(GraphQLRequestError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })
        })
    }
}

// we need a manual clone impl since the derive will
// choke if Doc isn't clone
#[cfg(not(target_family = "wasm"))]
impl<Doc> Clone for PreparedRequestReqwestSync<Doc> {
    fn clone(&self) -> Self {
        Self {
            addr: self.addr.clone(),
            client: self.client.clone(),
            nodes_len: self.nodes_len,
            doc: self.doc.clone(),
            variables: self.variables.clone(),
            path_to_files: self.path_to_files.clone(),
            opts: self.opts.clone(),
            placeholders: self.placeholders.clone(),
            _phantom: PhantomData,
        }
    }
}
impl<Doc> Clone for PreparedRequestReqwest<Doc> {
    fn clone(&self) -> Self {
        Self {
            addr: self.addr.clone(),
            client: self.client.clone(),
            nodes_len: self.nodes_len,
            doc: self.doc.clone(),
            variables: self.variables.clone(),
            path_to_files: self.path_to_files.clone(),
            opts: self.opts.clone(),
            placeholders: self.placeholders.clone(),
            _phantom: PhantomData,
        }
    }
}
