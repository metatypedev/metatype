use syn::{self, parse, parse::Parse, Meta};

#[derive(Debug, Default)]
pub struct TypegraphInitParams {
    pub name: String,
    pub path: String,
    pub prefix: Option<String>,
    pub dynamic: bool,
    pub cors: Cors,
    pub rate: Rate,
}

#[derive(Debug, Default)]
pub struct Cors {
    pub allow_origin: Vec<String>,
    pub allow_headers: Vec<String>,
    pub expose_headers: Vec<String>,
    pub allow_methods: Vec<String>,
    pub allow_credentials: bool,
}

#[derive(Debug, Default)]
pub struct Rate {
    pub window_limit: u32,
    pub window_sec: u32,
    pub query_limit: u32,
    pub context_identifier: Option<String>,
    pub local_excess: u32,
}
