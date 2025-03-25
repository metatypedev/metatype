// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::args::{NodeArgsMerged, PlaceholderValue};
use crate::interlude::*;
use crate::nodes::{SelectNodeErased, SubNodes};
use std::sync::Arc;

#[derive(Debug, Clone)]
pub enum TypePathSegment {
    Optional,
    ArrayItem,
    ObjectProp(&'static str),
}

#[derive(Debug, Clone)]
pub struct TypePath(pub &'static [TypePathSegment]);

// fn path_segment_as_prop(segment: &str) -> Option<&str> {
//     segment.strip_prefix('.')
// }
//
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PathToInputFiles(pub &'static [TypePath]);

#[derive(Debug)]
#[allow(dead_code)]
pub enum ValuePathSegment {
    Optional,
    Index(usize),
    Prop(&'static str),
}

#[derive(Default, Debug)]
#[allow(dead_code)]
pub struct ValuePath(pub Vec<ValuePathSegment>);

pub type TyToGqlTyMap = Arc<HashMap<CowStr, CowStr>>;

// PlaceholderValue, fieldName -> gql_var_name
pub(crate) type FoundPlaceholders = Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>;

pub(crate) struct GqlRequest {
    pub doc: String,
    pub variables: JsonObject,
    pub placeholders: FoundPlaceholders,
    pub path_to_files: HashMap<String, Vec<TypePath>>,
}

pub(crate) struct GqlRequestBuilder<'a> {
    ty_to_gql_ty_map: &'a TyToGqlTyMap,
    variable_values: JsonObject,
    variable_types: HashMap<CowStr, CowStr>,
    // map variable name to path to file types
    path_to_files: HashMap<String, Vec<TypePath>>,
    doc: String,
    placeholders: Vec<(PlaceholderValue, HashMap<CowStr, CowStr>)>,
}

impl<'a> GqlRequestBuilder<'a> {
    pub fn new(ty_to_gql_ty_map: &'a TyToGqlTyMap) -> Self {
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

    pub fn build(
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

pub(crate) enum BuildReqError {
    #[allow(dead_code)]
    FileUpload { error: BoxErr },
}

#[derive(Debug)]
pub struct GraphQLResponse {
    pub status_code: u16,
    // pub headers: reqwest::header::HeaderMap,
    pub body: JsonObject,
}

pub(crate) fn handle_response(
    response: GraphQLResponse,
    nodes_len: usize,
) -> Result<Vec<serde_json::Value>, GraphQLRequestError> {
    if !(200..300).contains(&response.status_code) {
        return Err(GraphQLRequestError::RequestFailed { response });
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
        response: GraphQLResponse,
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
                write!(f, "request failed with status {}", response.status_code)?;
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

#[derive(Debug)]
pub enum PrepareRequestError<T> {
    BuildError(GraphQLRequestError),
    PlaceholderError(BoxErr),
    RequestError(T),
    FileUploadError(BoxErr),
}

impl<T> From<BuildReqError> for PrepareRequestError<T> {
    fn from(error: BuildReqError) -> Self {
        match error {
            BuildReqError::FileUpload { error } => PrepareRequestError::FileUploadError(error),
        }
    }
}

impl<T: std::fmt::Display + std::fmt::Debug> std::error::Error for PrepareRequestError<T> {}
impl<T: std::fmt::Display> std::fmt::Display for PrepareRequestError<T> {
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
