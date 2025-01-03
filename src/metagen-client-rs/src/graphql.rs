// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::args::{NodeArgsMerged, PlaceholderValue, PreparedArgs};
use crate::files::{File, FileExtractor, PathToInputFiles, TypePath, TypePathSegment};
use crate::interlude::*;
use crate::nodes::{SelectNodeErased, SubNodes, ToMutationDoc, ToQueryDoc, ToSelectDoc};
use std::sync::Arc;

pub type TyToGqlTyMap = Arc<HashMap<CowStr, CowStr>>;

#[derive(Default, Clone)]
pub struct GraphQlTransportOptions {
    headers: reqwest::header::HeaderMap,
    timeout: Option<std::time::Duration>,
}

// PlaceholderValue, fieldName -> gql_var_name
type FoundPlaceholders = Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>;

struct GqlRequest {
    doc: String,
    variables: JsonObject,
    placeholders: FoundPlaceholders,
    path_to_files: HashMap<String, Vec<TypePath>>,
}

struct GqlRequestBuilder<'a> {
    ty_to_gql_ty_map: &'a TyToGqlTyMap,
    variable_values: JsonObject,
    variable_types: HashMap<CowStr, CowStr>,
    // map variable name to path to file types
    path_to_files: HashMap<String, Vec<TypePath>>,
    doc: String,
    placeholders: Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>,
}

impl<'a> GqlRequestBuilder<'a> {
    fn new(ty_to_gql_ty_map: &'a TyToGqlTyMap) -> Self {
        Self {
            ty_to_gql_ty_map,
            variable_values: Default::default(),
            variable_types: Default::default(),
            path_to_files: Default::default(),
            doc: Default::default(),
            placeholders: Default::default(),
        }
    }

    fn register_path_to_files(&mut self, name: String, key: &str, files: &PathToInputFiles) {
        let path_to_files = files
            .0
            .iter()
            .filter_map(|path| {
                let first = &path.0[0];
                if let TypePathSegment::ObjectProp(prop_key) = first {
                    if *prop_key == key {
                        return Some(TypePath(&path.0[1..]));
                    }
                }
                None
            })
            .collect::<Vec<_>>();
        self.path_to_files.insert(name, path_to_files);
    }

    fn select_node_to_gql(&mut self, node: SelectNodeErased) -> std::fmt::Result {
        use std::fmt::Write;
        if node.instance_name != node.node_name {
            write!(self.doc, "{}: {}", node.instance_name, node.node_name)?;
        } else {
            write!(self.doc, "{}", node.node_name)?;
        }

        if let Some(args) = node.args {
            match args {
                NodeArgsMerged::Inline(args) => {
                    if !args.is_empty() {
                        write!(&mut self.doc, "(")?;
                        for (key, val) in args {
                            let name = format!("in{}", self.variable_types.len());

                            let mut map = serde_json::Map::new();
                            map.insert(key.clone().into(), val.value.clone());
                            let mut object = serde_json::Value::Object(map);

                            if let Some(files) = node.input_files.as_ref() {
                                self.register_path_to_files(name.clone(), key.as_ref(), files);
                            }

                            write!(&mut self.doc, "{key}: ${name}, ")?;
                            self.variable_values.insert(
                                name.clone(),
                                object
                                    .as_object_mut()
                                    .unwrap()
                                    .remove(key.as_ref())
                                    .unwrap(),
                            );
                            self.variable_types.insert(name.into(), val.type_name);
                        }
                        write!(&mut self.doc, ")")?;
                    }
                }
                NodeArgsMerged::Placeholder { value, arg_types } => {
                    if !arg_types.is_empty() {
                        write!(&mut self.doc, "(")?;
                        let mut map = HashMap::new();
                        for (key, type_name) in arg_types {
                            let name = format!("in{}", self.variable_types.len());
                            if let Some(files) = node.input_files.as_ref() {
                                self.register_path_to_files(name.clone(), key.as_ref(), files);
                            }
                            write!(&mut self.doc, "{key}: ${name}, ")?;
                            self.variable_types.insert(name.clone().into(), type_name);
                            map.insert(key, name.into());
                        }
                        write!(&mut self.doc, ")")?;
                        self.placeholders.push((value, map));
                    }
                }
            }
        }

        match node.sub_nodes {
            SubNodes::None => {}
            SubNodes::Atomic(sub_nodes) => {
                write!(&mut self.doc, "{{ ")?;
                for node in sub_nodes {
                    self.select_node_to_gql(node)?;
                    write!(&mut self.doc, " ")?;
                }
                write!(&mut self.doc, " }}")?;
            }
            SubNodes::Union(variants) => {
                write!(&mut self.doc, "{{ ")?;
                for (ty, sub_nodes) in variants {
                    let gql_ty = self
                        .ty_to_gql_ty_map
                        .get(&ty[..])
                        .expect("impossible: no GraphQL type equivalent found for variant type");
                    let gql_ty = match gql_ty.strip_suffix('!') {
                        Some(val) => val,
                        None => &gql_ty[..],
                    };
                    write!(&mut self.doc, " ... on {gql_ty} {{ ")?;
                    for node in sub_nodes {
                        self.select_node_to_gql(node)?;
                        write!(&mut self.doc, " ")?;
                    }
                    write!(&mut self.doc, " }}")?;
                }
                write!(&mut self.doc, " }}")?;
            }
        }
        Ok(())
    }

    fn build(
        mut self,
        nodes: Vec<SelectNodeErased>,
        ty: &'static str,
        name: Option<CowStr>,
    ) -> Result<GqlRequest, GraphQLRequestError> {
        use std::fmt::Write;

        for (idx, node) in nodes.into_iter().enumerate() {
            let node = SelectNodeErased {
                instance_name: format!("node{idx}").into(),
                ..node
            };
            write!(&mut self.doc, "  ").expect("error building to string");
            self.select_node_to_gql(node)
                .expect("error building to string");
            writeln!(&mut self.doc).expect("error building to string");
        }

        let mut args_row = String::new();
        if !self.variable_types.is_empty() {
            write!(&mut args_row, "(").expect("error building to string");
            for (key, ty) in &self.variable_types {
                let gql_ty = self.ty_to_gql_ty_map.get(&ty[..]).ok_or_else(|| {
                    GraphQLRequestError::InvalidQuery {
                        error: Box::from(format!("unknown typegraph type found: {}", ty)),
                    }
                })?;
                write!(&mut args_row, "${key}: {gql_ty}, ").expect("error building to string");
            }
            write!(&mut args_row, ")").expect("error building to string");
        }

        let name = name.unwrap_or_else(|| "".into());
        let doc = format!("{ty} {name}{args_row} {{\n{doc}}}", doc = self.doc);
        Ok(GqlRequest {
            doc,
            variables: self.variable_values,
            placeholders: self.placeholders,
            path_to_files: self.path_to_files,
        })
    }
}

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

use reqwest::blocking::{Client as ClientSync, RequestBuilder as RequestBuilderSync};

enum BuildReqError {
    FileUpload { error: BoxErr },
}

fn build_gql_req_sync(
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
async fn build_gql_req(
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

#[derive(Debug)]
pub struct GraphQLResponse {
    pub status: reqwest::StatusCode,
    pub headers: reqwest::header::HeaderMap,
    pub body: JsonObject,
}

fn handle_response(
    response: GraphQLResponse,
    nodes_len: usize,
) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
    if !response.status.is_success() {
        return Err(GraphQLRequestError::RequestFailed {
            response: Box::new(response),
        });
    }
    #[derive(Debug, Deserialize)]
    struct Response {
        data: Option<JsonObject>,
        errors: Option<Vec<GraphqlError>>,
    }
    let body: Response = match serde_json::from_value(serde_json::Value::Object(response.body)) {
        Ok(body) => body,
        Err(error) => {
            return Err(GraphQLRequestError::BodyError {
                error: Box::new(error),
            })
        }
    };
    if let Some(errors) = body.errors {
        return Err(GraphQLRequestError::RequestErrors {
            errors,
            data: body.data,
        });
    }
    let Some(mut body) = body.data else {
        return Err(GraphQLRequestError::BodyError {
            error: Box::from("body response doesn't contain data field"),
        });
    };
    (0..nodes_len)
        .map(|idx| {
            body.remove(&format!("node{idx}"))
                .ok_or_else(|| GraphQLRequestError::BodyError {
                    error: Box::from(format!(
                        "expecting response under node key 'node{idx}' but none found"
                    )),
                })
        })
        .collect::<Result<Vec<_>, _>>()
}

#[derive(Debug)]
pub enum GraphQLRequestError {
    /// GraphQL errors recieived
    RequestErrors {
        errors: Vec<GraphqlError>,
        data: Option<JsonObject>,
    },
    /// Http error codes recieived
    RequestFailed {
        response: Box<GraphQLResponse>,
    },
    /// Unable to deserialize body
    BodyError {
        error: BoxErr,
    },
    /// Unable to make http request
    NetworkError {
        error: BoxErr,
    },
    InvalidQuery {
        error: BoxErr,
    },
    /// Unable to upload file
    FileUpload {
        error: BoxErr,
    },
}

impl From<BuildReqError> for GraphQLRequestError {
    fn from(error: BuildReqError) -> Self {
        match error {
            BuildReqError::FileUpload { error } => GraphQLRequestError::FileUpload { error },
        }
    }
}

impl std::fmt::Display for GraphQLRequestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GraphQLRequestError::RequestErrors { errors, .. } => {
                write!(f, "graphql errors in response: ")?;
                for err in errors {
                    write!(f, "{}, ", err.message)?;
                }
            }
            GraphQLRequestError::RequestFailed { response } => {
                write!(f, "request failed with status {}", response.status)?;
            }
            GraphQLRequestError::BodyError { error } => {
                write!(f, "error reading request body: {error}")?;
            }
            GraphQLRequestError::NetworkError { error } => {
                write!(f, "error making http request: {error}")?;
            }
            GraphQLRequestError::InvalidQuery { error } => {
                write!(f, "error building request: {error}")?
            }
            GraphQLRequestError::FileUpload { error } => {
                write!(f, "error uploading file: {error}")?
            }
        }
        Ok(())
    }
}
impl std::error::Error for GraphQLRequestError {}

#[derive(Debug, Deserialize)]
pub struct ErrorLocation {
    pub line: u32,
    pub column: u32,
}
#[derive(Debug, Deserialize)]
pub struct GraphqlError {
    pub message: String,
    pub locations: Option<Vec<ErrorLocation>>,
    pub path: Option<Vec<PathSegment>>,
}

#[derive(Debug)]
pub enum PathSegment {
    Field(String),
    Index(u64),
}

impl<'de> serde::de::Deserialize<'de> for PathSegment {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde_json::Value;
        let val = Value::deserialize(deserializer)?;
        match val {
            Value::Number(n) => Ok(PathSegment::Index(n.as_u64().unwrap())),
            Value::String(s) => Ok(PathSegment::Field(s)),
            _ => panic!("invalid path segment type"),
        }
    }
}

#[derive(Clone)]
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
                let headers = res.headers().clone();
                match res.json::<JsonObject>() {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status,
                            headers,
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
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
        self.prepare_query_with_opts(fun, Default::default())
    }

    pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
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
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
        self.prepare_mutation_with_opts(fun, Default::default())
    }

    pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwestSync<Doc>, PrepareRequestError> {
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

        let req = build_gql_req(
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
                let headers = res.headers().clone();
                match res.json::<JsonObject>().await {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status,
                            headers,
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
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
        self.prepare_query_with_opts(fun, Default::default())
    }

    pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
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
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
        self.prepare_mutation_with_opts(fun, Default::default())
    }

    pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: GraphQlTransportOptions,
    ) -> Result<PreparedRequestReqwest<Doc>, PrepareRequestError> {
        PreparedRequestReqwest::new(
            fun,
            self.addr.clone(),
            opts,
            "mutation",
            &self.ty_to_gql_ty_map,
        )
    }
}

fn resolve_prepared_variables(
    placeholders: &FoundPlaceholders,
    mut inline_variables: JsonObject,
    mut args: HashMap<CowStr, serde_json::Value>,
) -> Result<JsonObject, PrepareRequestError> {
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

impl<Doc: ToSelectDoc> PreparedRequestReqwestSync<Doc> {
    fn new(
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        addr: Url,
        opts: GraphQlTransportOptions,
        ty: &'static str,
        ty_to_gql_ty_map: &TyToGqlTyMap,
    ) -> Result<Self, PrepareRequestError> {
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
    ) -> Result<Doc::Out, PrepareRequestError>
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
                let headers = res.headers().clone();
                match res.json::<JsonObject>() {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status,
                            headers,
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
    ) -> Result<Self, PrepareRequestError> {
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
    ) -> Result<Doc::Out, PrepareRequestError>
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
        let req = build_gql_req(
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
                let headers = res.headers().clone();
                match res.json::<JsonObject>().await {
                    Ok(body) => handle_response(
                        GraphQLResponse {
                            status,
                            headers,
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

#[derive(Debug)]
pub enum PrepareRequestError {
    BuildError(GraphQLRequestError),
    PlaceholderError(BoxErr),
    RequestError(GraphQLRequestError),
    FileUploadError(BoxErr),
}

impl From<BuildReqError> for PrepareRequestError {
    fn from(error: BuildReqError) -> Self {
        match error {
            BuildReqError::FileUpload { error } => PrepareRequestError::FileUploadError(error),
        }
    }
}

impl std::error::Error for PrepareRequestError {}
impl std::fmt::Display for PrepareRequestError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            /* PrepareRequestError::FunctionError(err) => {
                write!(f, "error calling doc builder closure: {err}")
            } */
            PrepareRequestError::BuildError(err) => write!(f, "error building request: {err}"),
            PrepareRequestError::PlaceholderError(err) => {
                write!(f, "error resolving placeholder values: {err}")
            }
            PrepareRequestError::RequestError(err) => {
                write!(f, "error making graphql request: {err}")
            }
            PrepareRequestError::FileUploadError(err) => {
                write!(f, "error uploading file: {err}")
            }
        }
    }
}
