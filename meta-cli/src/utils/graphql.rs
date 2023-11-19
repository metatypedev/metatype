// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use anyhow::{bail, Result};
use async_trait::async_trait;
use colored::Colorize;
use itertools::Itertools;
use reqwest::{header::CONTENT_TYPE, RequestBuilder, Response as HttpResponse};
use serde::Deserialize;
use serde_json;
use std::fmt;

#[derive(Debug, Deserialize)]
pub struct Response {
    data: serde_json::Value,
    errors: Option<Vec<GraphqlError>>,
}

impl Response {
    #[allow(dead_code)]
    pub fn display_errors(&self) {
        if let Some(errors) = &self.errors {
            println!("Error{s}:", s = if errors.len() > 1 { "s" } else { "" });
            for error in errors {
                println!("{}", format!(" - {}", error.message).red());
            }
        }
    }

    pub fn data<T>(&self, field: &str) -> Result<T>
    where
        T: serde::de::DeserializeOwned,
    {
        let value = &self.data[field];
        if value.is_null() {
            bail!("value for {field} is not found in the response");
        }
        Ok(serde_json::from_value(value.clone())?)
    }
}

#[async_trait]
pub trait Query {
    async fn gql(
        self,
        query: String,
        variables: Option<serde_json::Value>,
    ) -> Result<Response, Error>;
}

#[derive(Debug, Deserialize)]
pub struct ErrorLocation {
    pub line: u32,
    pub column: u32,
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

#[derive(Debug, Deserialize)]
pub struct GraphqlError {
    pub message: String,
    pub locations: Option<Vec<ErrorLocation>>,
    pub path: Option<Vec<PathSegment>>,
}

#[derive(Deserialize)]
struct FailedQueryResponse {
    errors: Vec<GraphqlError>,
}

pub enum Error {
    EndpointNotReachable(String),
    FailedQuery(Vec<GraphqlError>),
    InvalidResponse(String),
}

pub trait GraphqlErrorMessages {
    fn error_messages(&self) -> String;
}

impl GraphqlErrorMessages for Vec<GraphqlError> {
    fn error_messages(&self) -> String {
        self.iter().map(|e| format!(" - {}", e.message)).join("\n")
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use Error::*;
        match self {
            EndpointNotReachable(e) => write!(f, "{e}"),
            FailedQuery(errors) => write!(f, "query failed: {}", errors.error_messages()),
            InvalidResponse(e) => write!(f, "invalid http response: {e}"),
        }
    }
}

impl From<Error> for anyhow::Error {
    fn from(e: Error) -> Self {
        use anyhow::anyhow;
        anyhow!("{e}")
    }
}

#[async_trait]
impl Query for RequestBuilder {
    // TODO deserialize output value
    async fn gql(
        self,
        query: String,
        variables: Option<serde_json::Value>,
    ) -> Result<Response, Error> {
        let payload = {
            let mut payload = serde_json::Map::default();
            payload.insert("query".to_string(), serde_json::Value::String(query));
            if let Some(vars) = variables {
                payload.insert("variables".to_string(), vars);
            }
            payload
        };
        let query = self.json(&payload).send().await;

        match query {
            Err(e) => Err(Error::EndpointNotReachable(format!(
                "GraphQL endpoint unreachable: {e}"
            ))),
            Ok(res) if !res.status().is_success() => Err(handle_error(res).await.unwrap_err()),
            Ok(res) => {
                let content = res.text().await.map_err(|e| {
                    Error::InvalidResponse(format!("could not decode response: {e:?}"))
                })?;
                Ok(serde_json::from_str(&content).map_err(|e| {
                    Error::InvalidResponse(format!("could not deserialize JSON response: {e}"))
                })?)
            }
        }
    }
}

async fn handle_error(res: HttpResponse) -> Result<(), Error> {
    let content_type = res
        .headers()
        .get(CONTENT_TYPE)
        .ok_or_else(|| Error::InvalidResponse("Response has not Content-Type header".to_owned()))?;

    let content_type = content_type.to_str().map_err(|e| {
        Error::InvalidResponse(format!("Could not parse Content-Type header: {e:?}"))
    })?;

    if content_type.starts_with("text/plain") {
        let status = res.status().as_u16();
        let text = res
            .text()
            .await
            .map_err(|e| Error::InvalidResponse(format!("Could not decode response: {e}")))?;
        return Err(Error::FailedQuery(vec![GraphqlError {
            message: format!("Error {status}: {text}"),
            locations: None,
            path: None,
        }]));
    }

    if content_type != "application/json" {
        return Err(Error::InvalidResponse(format!(
            "Unsupported Content-Type from the typegate: {content_type}"
        )));
    }

    let content = res
        .text()
        .await
        .map_err(|e| Error::InvalidResponse(format!("Could not decode response: {e}")))?;
    let errors = serde_json::from_str::<FailedQueryResponse>(&content)
        .map(|json| json.errors)
        .map_err(|e| Error::InvalidResponse(format!("Response is not in graphql format: {e:?}")))?;
    Err(Error::FailedQuery(errors))
}
