// Copyright Metatype under the Elastic License 2.0.

use anyhow::{bail, Result};
use dialoguer::{Input, Password};
use reqwest::{
    blocking::{Client, RequestBuilder},
    IntoUrl,
};
use std::collections::HashMap;
use std::hash::Hash;
use std::path::Path;
use std::time::Duration;

pub fn ensure_venv<P: AsRef<Path>>(dir: P) -> Result<()> {
    use std::env::{set_var, var};
    if var("VIRTUAL_ENV").is_ok() {
        return Ok(());
    }

    let venv_dir = dir.as_ref().join(".venv");

    if venv_dir.is_dir() {
        let venv = venv_dir.to_str().unwrap();
        let venv_bin = venv_dir.join("bin");
        let venv_bin = venv_bin.to_str().unwrap();
        let path = var("PATH")?;
        set_var("VIRTUAL_ENV", venv);
        set_var("PATH", &format!("{venv_bin}:{path}"));
        Ok(())
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

    pub fn as_user(username: String) -> Result<Self> {
        let password = Password::new()
            .with_prompt(format!("Password for user {username}"))
            .interact()?;
        Ok(Self { username, password })
    }
}

pub fn post_with_auth<U: IntoUrl>(auth: &BasicAuth, url: U) -> Result<RequestBuilder> {
    Ok(Client::new()
        .post(url)
        .basic_auth(&auth.username, Some(&auth.password))
        .timeout(Duration::from_secs(5)))
}

pub mod graphql {
    use anyhow::{bail, Result};
    use colored::Colorize;
    use reqwest::blocking::RequestBuilder;
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
                Ok(res) if !res.status().is_success() => {
                    let content = res.text().map_err(|e| {
                        Error::InvalidResponse(format!("could not decode response: {e}"))
                    })?;
                    let errors = serde_json::from_str::<FailedQueryResponse>(&content)
                        .map(|json| json.errors)
                        .map_err(|err| Error::InvalidResponse(format!("{err}")))?;
                    Err(Error::FailedQuery(errors))
                }
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
