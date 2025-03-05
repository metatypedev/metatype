// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::args::PreparedArgs;
use crate::common::*;
use crate::interlude::*;
use crate::nodes::{SelectNodeErased, ToMutationDoc, ToQueryDoc, ToSelectDoc};

use std::sync::Arc;

#[derive(Clone, Default)]
pub struct HostcallTransportOptions {}

type HostcallBinding = Arc<dyn Fn(&str, &str) -> Result<String, String>>;

#[derive(Clone)]
pub struct HostcallTransport {
    ty_to_gql_ty_map: TyToGqlTyMap,
    binding: HostcallBinding,
}

impl HostcallTransport {
    pub fn new(binding: HostcallBinding, ty_to_gql_ty_map: TyToGqlTyMap) -> Self {
        Self {
            ty_to_gql_ty_map,
            binding,
        }
    }

    fn fetch(
        &self,
        nodes: Vec<SelectNodeErased>,
        ty: &'static str,
    ) -> Result<Vec<serde_json::Value>, HostcallError> {
        let nodes_len = nodes.len();
        let GqlRequest {
            doc,
            variables,
            placeholders,
            ..
            // TODO: file support in hostcall
        } = GqlRequestBuilder::new(&self.ty_to_gql_ty_map).build(nodes, ty, None)?;
        if !placeholders.is_empty() {
            panic!("placeholders found in non-prepared query")
        }
        match (self.binding)(
            "gql",
            &serde_json::to_string(&serde_json::json!({
                "query": doc,
                "variables": variables,
            }))?,
        ) {
            Ok(json) => Ok(handle_response(
                GraphQLResponse {
                    status_code: 200,
                    body: serde_json::from_str(&json[..])?,
                },
                nodes_len,
            )?),
            Err(json) => Err(HostcallError::HostError {
                error: serde_json::from_str(&json)?,
            }),
        }
    }

    pub fn query<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
    ) -> Result<Doc::Out, HostcallError> {
        self.query_with_opts(nodes, &Default::default())
    }

    pub fn query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        nodes: Doc,
        _opts: &HostcallTransportOptions,
    ) -> Result<Doc::Out, HostcallError> {
        let resp = self.fetch(nodes.to_select_doc(), "query")?;
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
    ) -> Result<Doc::Out, HostcallError> {
        self.mutation_with_opts(nodes, &Default::default()).await
    }

    pub async fn mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        nodes: Doc,
        _opts: &HostcallTransportOptions,
    ) -> Result<Doc::Out, HostcallError> {
        let resp = self.fetch(nodes.to_select_doc(), "mutation")?;
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
    ) -> Result<PreparedRequestHostcall<Doc>, PrepareRequestError<HostcallError>> {
        self.prepare_query_with_opts(fun, Default::default())
    }

    pub fn prepare_query_with_opts<Doc: ToSelectDoc + ToQueryDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: HostcallTransportOptions,
    ) -> Result<PreparedRequestHostcall<Doc>, PrepareRequestError<HostcallError>> {
        PreparedRequestHostcall::new(
            self.binding.clone(),
            fun,
            opts,
            "query",
            &self.ty_to_gql_ty_map,
        )
    }

    pub fn prepare_mutation<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
    ) -> Result<PreparedRequestHostcall<Doc>, PrepareRequestError<HostcallError>> {
        self.prepare_mutation_with_opts(fun, Default::default())
    }

    pub fn prepare_mutation_with_opts<Doc: ToSelectDoc + ToMutationDoc>(
        &self,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: HostcallTransportOptions,
    ) -> Result<PreparedRequestHostcall<Doc>, PrepareRequestError<HostcallError>> {
        PreparedRequestHostcall::new(
            self.binding.clone(),
            fun,
            opts,
            "mutation",
            &self.ty_to_gql_ty_map,
        )
    }
}

pub struct PreparedRequestHostcall<Doc> {
    binding: HostcallBinding,
    nodes_len: usize,
    pub doc: String,
    variables: JsonObject,
    path_to_files: HashMap<String, Vec<TypePath>>,
    opts: HostcallTransportOptions,
    placeholders: Arc<FoundPlaceholders>,
    _phantom: PhantomData<Doc>,
}

impl<Doc: ToSelectDoc> PreparedRequestHostcall<Doc> {
    fn new(
        binding: HostcallBinding,
        fun: impl FnOnce(&mut PreparedArgs) -> Doc,
        opts: HostcallTransportOptions,
        ty: &'static str,
        ty_to_gql_ty_map: &TyToGqlTyMap,
    ) -> Result<Self, PrepareRequestError<HostcallError>> {
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
            .map_err(|err| PrepareRequestError::RequestError(err.into()))?;
        Ok(Self {
            binding,
            doc,
            variables,
            path_to_files,
            nodes_len,
            opts,
            placeholders: Arc::new(placeholders),
            _phantom: PhantomData,
        })
    }

    pub fn perform<K, V>(
        &self,
        args: impl Into<HashMap<K, V>>,
    ) -> Result<Doc::Out, PrepareRequestError<HostcallError>>
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

        let res = match (self.binding)(
            "gql",
            &serde_json::to_string(&serde_json::json!({
                "query": self.doc,
                "variables": variables,
            }))?,
        ) {
            Ok(json) => handle_response(
                GraphQLResponse {
                    status_code: 200,
                    body: serde_json::from_str(&json[..])?,
                },
                self.nodes_len,
            )
            .map_err(|err| PrepareRequestError::RequestError(err.into()))?,
            Err(json) => {
                return Err(PrepareRequestError::RequestError(
                    HostcallError::HostError {
                        error: serde_json::from_str(&json)?,
                    },
                ))
            }
        };
        Doc::parse_response(res).map_err(|err| {
            PrepareRequestError::RequestError(HostcallError::BodyError {
                error: Box::from(format!(
                    "error deserializing response into output type: {err}"
                )),
            })
        })
    }
}
// we need a manual clone impl since the derive will
// choke if Doc isn't clone
impl<Doc> Clone for PreparedRequestHostcall<Doc> {
    fn clone(&self) -> Self {
        Self {
            binding: self.binding.clone(),
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
pub enum HostcallError {
    /// GraphQL errors recieived
    RequestErrors {
        errors: Vec<GraphqlError>,
        data: Option<JsonObject>,
    },
    /// Unable to deserialize body
    BodyError {
        error: BoxErr,
    },
    InvalidQuery {
        error: BoxErr,
    },
    HostError {
        error: serde_json::Value,
    },
}

impl From<serde_json::Error> for HostcallError {
    fn from(value: serde_json::Error) -> Self {
        Self::BodyError {
            error: value.into(),
        }
    }
}
impl From<serde_json::Error> for PrepareRequestError<HostcallError> {
    fn from(value: serde_json::Error) -> Self {
        PrepareRequestError::RequestError(HostcallError::BodyError {
            error: value.into(),
        })
    }
}
impl std::fmt::Display for HostcallError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HostcallError::RequestErrors { errors, .. } => {
                write!(f, "graphql errors in response: ")?;
                for err in errors {
                    write!(f, "{}, ", err.message)?;
                }
            }
            HostcallError::BodyError { error } => {
                write!(f, "error reading request body: {error}")?;
            }
            HostcallError::InvalidQuery { error } => write!(f, "error building request: {error}")?,
            HostcallError::HostError { error } => write!(f, "host error: {error}")?,
        }
        Ok(())
    }
}
impl std::error::Error for HostcallError {}

impl From<GraphQLRequestError> for HostcallError {
    fn from(value: GraphQLRequestError) -> Self {
        match value {
            GraphQLRequestError::RequestErrors { errors, data } => {
                Self::RequestErrors { errors, data }
            }
            GraphQLRequestError::BodyError { error } => Self::BodyError { error },
            GraphQLRequestError::InvalidQuery { error } => Self::InvalidQuery { error },
            GraphQLRequestError::NetworkError { .. }
            | GraphQLRequestError::RequestFailed { .. } => unreachable!(),
            GraphQLRequestError::FileUpload { .. } => todo!("file uploads not yet supported"),
        }
    }
}
