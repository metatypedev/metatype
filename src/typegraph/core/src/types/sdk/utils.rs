use super::core::TypeId;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReduceEntry {
    pub path: Vec<String>,
    pub injection_data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthProtocol {
    Oauth2,
    Jwt,
    Basic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Auth {
    pub name: String,
    pub protocol: AuthProtocol,
    pub auth_data: Vec<(String, String)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryDeployParams {
    pub tg: String,
    pub secrets: Option<Vec<(String, String)>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FdkConfig {
    pub workspace_path: String,
    pub target_name: String,
    pub config_json: String,
    pub tg_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FdkOutput {
    pub path: String,
    pub content: String,
    pub overwrite: bool,
}

pub trait Handler {
    fn reduceb(super_type_id: TypeId, entries: Vec<ReduceEntry>) -> Result<TypeId, super::Error>;
    fn add_graphql_endpoint(graphql: String) -> Result<u32, super::Error>;
    fn add_auth(data: Auth) -> Result<u32, super::Error>;
    fn add_raw_auth(data: String) -> Result<u32, super::Error>;
    fn oauth2(service_name: String, scopes: String) -> Result<String, super::Error>;
    fn oauth2_without_profiler(
        service_name: String,
        scopes: String,
    ) -> Result<String, super::Error>;
    fn oauth2_with_extended_profiler(
        service_name: String,
        scopes: String,
        extension: String,
    ) -> Result<String, super::Error>;
    fn oauth2_with_custom_profiler(
        service_name: String,
        scopes: String,
        profiler: TypeId,
    ) -> Result<String, super::Error>;
    fn gql_deploy_query(params: QueryDeployParams) -> Result<String, super::Error>;
    fn gql_remove_query(tg_name: Vec<String>) -> Result<String, super::Error>;
    fn metagen_exec(config: FdkConfig) -> Result<Vec<FdkOutput>, super::Error>;
    fn metagen_write_files(
        items: Vec<FdkOutput>,
        typegraph_dir: String,
    ) -> Result<(), super::Error>;
}
