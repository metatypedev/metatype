use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct Typegraph {
    pub types: Vec<TypeNode>,
    pub materializers: Vec<Materializer>,
    pub runtimes: Vec<TGRuntime>,
    pub policies: Vec<Policy>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub allow_credentials: bool,
    pub max_age: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Auth {
    pub name: String,
    pub protocol: String,
    pub authorize_url: String,
    pub access_url: String,
    pub scopes: String,
    pub profile_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TypeMeta {
    pub secrets: Vec<String>,
    pub cors: Cors,
    pub auths: Vec<Auth>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TypeNode {
    pub name: String,
    pub typedef: String,
    pub policies: Vec<u32>,
    pub runtime: u32,
    pub data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Materializer {
    pub name: String,
    pub runtime: u32,
    pub data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TGRuntime {
    pub name: String,
    pub data: HashMap<String, Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Policy {
    pub name: String,
    pub materializer: u32,
}

impl Typegraph {
    pub fn from_json<S: AsRef<str>>(json: S) -> Result<Self> {
        serde_json::from_str(json.as_ref()).context("could not load typegraph from JSON")
    }
}

impl TypeNode {
    pub fn get_struct_fields(&self) -> Result<HashMap<String, u32>> {
        assert!(&self.typedef == "struct");
        let binds = self
            .data
            .get("binds")
            .ok_or_else(|| anyhow!("field \"binds\" not found in struct data"))?;
        Ok(serde_json::from_value(binds.clone())?)
    }
}
