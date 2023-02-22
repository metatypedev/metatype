// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

pub mod clap;

use anyhow::{bail, Result};
use dialoguer::{Input, Password};
use pathdiff::diff_paths;
use reqwest::{
    blocking::{Client, RequestBuilder},
    IntoUrl, Url,
};
use std::env::{set_var, var};
use std::fs;
use std::hash::Hash;
use std::path::Path;
use std::time::Duration;
use std::{collections::HashMap, path::PathBuf};

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    if var("VIRTUAL_ENV").is_ok() {
        return Ok(());
    }

    let dir = fs::canonicalize(dir)?;
    let venv_dir = dir.join(".venv");

    if venv_dir.is_dir() {
        let venv = venv_dir.to_str().unwrap();

        let path = var("PATH")?;

        // https://github.com/pypa/virtualenv/commit/993ba1316a83b760370f5a3872b3f5ef4dd904c1
        #[cfg(target_os = "windows")]
        let path = format!(
            "{venv_bin};{path}",
            venv_bin = venv_dir.as_path().join("Scripts").to_str().unwrap()
        );
        #[cfg(not(target_os = "windows"))]
        let path = format!(
            "{venv_bin}:{path}",
            venv_bin = venv_dir.as_path().join("bin").to_str().unwrap()
        );

        set_var("VIRTUAL_ENV", venv);
        set_var("PATH", path);
        Ok(())
    } else if let Some(dir) = dir.parent() {
        ensure_venv(dir)
    } else {
        bail!("Python venv required")
    }
}

#[derive(Clone)]
pub struct BasicAuth {
    username: String,
    password: String,
}

impl BasicAuth {
    pub fn new(username: String, password: String) -> Self {
        Self { username, password }
    }

    pub fn prompt() -> Result<Self> {
        let username = Input::new().with_prompt("Username").interact_text()?;
        let password = Password::new().with_prompt("Password").interact()?;
        Ok(Self { username, password })
    }

    pub fn prompt_as_user(username: String) -> Result<Self> {
        let password = Password::new()
            .with_prompt(format!("Password for user {username}"))
            .interact()?;
        Ok(Self { username, password })
    }
}

pub struct Node {
    base_url: Url,
    auth: Option<BasicAuth>,
}

impl Node {
    pub fn new<U: IntoUrl>(url: U, auth: Option<BasicAuth>) -> Result<Self> {
        Ok(Self {
            base_url: url.into_url()?,
            auth,
        })
    }

    pub fn post(&self, path: &str) -> Result<RequestBuilder> {
        let mut b = Client::new().post(self.base_url.join(path)?);
        if let Some(auth) = &self.auth {
            b = b.basic_auth(&auth.username, Some(&auth.password));
        }
        Ok(b.timeout(Duration::from_secs(5)))
    }
}

pub mod graphql {
    use anyhow::{bail, Result};
    use colored::Colorize;
    use reqwest::{
        blocking::{RequestBuilder, Response as HttpResponse},
        header::CONTENT_TYPE,
    };
    use serde::Deserialize;
    use serde_json;
    use std::fmt;

    #[derive(Deserialize)]
    pub struct Response {
        data: serde_json::Value,
        errors: Option<Vec<GraphqlError>>,
    }

    impl Response {
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

    pub trait Query {
        fn gql(
            self,
            query: String,
            variables: Option<serde_json::Value>,
        ) -> Result<Response, Error>;
    }

    #[derive(Deserialize)]
    pub struct ErrorLocation {
        pub line: u32,
        pub column: u32,
    }

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

    #[derive(Deserialize)]
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
            self.iter().map(|e| format!(" - {}\n", e.message)).collect()
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

    impl Query for RequestBuilder {
        // TODO deserialize output value
        fn gql(
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
            let query = self.json(&payload).send();

            match query {
                Err(e) => Err(Error::EndpointNotReachable(format!(
                    "GraphQL endpoint unreachable: {e}"
                ))),
                Ok(res) if !res.status().is_success() => Err(handle_error(res).unwrap_err()),
                Ok(res) => {
                    let content = res.text().map_err(|e| {
                        Error::InvalidResponse(format!("could not decode response: {e:?}"))
                    })?;
                    Ok(serde_json::from_str(&content).map_err(|e| {
                        Error::InvalidResponse(format!("could not deserialize JSON response: {e}"))
                    })?)
                }
            }
        }
    }

    fn handle_error(res: HttpResponse) -> Result<(), Error> {
        let content_type = res.headers().get(CONTENT_TYPE).ok_or_else(|| {
            Error::InvalidResponse("Response has not Content-Type header".to_owned())
        })?;

        let content_type = content_type.to_str().map_err(|e| {
            Error::InvalidResponse(format!("Could not parse Content-Type header: {e:?}"))
        })?;

        if content_type == "text/plain" {
            let status = res.status().as_u16();
            let text = res
                .text()
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
            .map_err(|e| Error::InvalidResponse(format!("Could not decode response: {e}")))?;
        let errors = serde_json::from_str::<FailedQueryResponse>(&content)
            .map(|json| json.errors)
            .map_err(|e| {
                Error::InvalidResponse(format!("Response is not in graphql format: {e:?}"))
            })?;
        Err(Error::FailedQuery(errors))
    }
}

pub trait MapValues<K, V, W, O>: IntoIterator<Item = (K, V)>
where
    // K: Eq,
    O: FromIterator<(K, W)>,
{
    fn map_values<M>(self, f: M) -> O
    where
        M: Fn(V) -> W;
}

impl<K, V, W> MapValues<K, V, W, HashMap<K, W>> for HashMap<K, V>
where
    K: Eq + Hash,
{
    fn map_values<M>(self, f: M) -> HashMap<K, W>
    where
        M: Fn(V) -> W,
    {
        self.into_iter().map(|(k, v)| (k, f(v))).collect()
    }
}

pub fn relative_path_display<P1: Into<PathBuf>, P2: Into<PathBuf>>(base: P1, path: P2) -> String {
    let path: PathBuf = path.into();
    diff_paths(&path, base.into())
        .unwrap_or(path)
        .display()
        .to_string()
}
