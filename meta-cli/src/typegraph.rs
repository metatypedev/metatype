use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct Typegraph {
    pub types: Vec<TypeNode>,
    pub materializers: Vec<Materializer>,
    pub runtimes: Vec<TGRuntime>,
    pub policies: Vec<Policy>,
    pub codes: Vec<Code>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TypeNode {
    pub name: String,
    pub typedef: String,
    pub edges: Vec<u32>,
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

#[derive(Serialize, Deserialize, Debug)]
pub struct Code {
    pub name: String,
    #[serde(rename = "type")]
    pub typ: String,
    pub source: String,
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
