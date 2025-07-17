// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Oauth2Client {
    pub id_secret: String,
    pub redirect_uri_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BaseOauth2Params {
    pub provider: String,
    pub scopes: String,
    pub clients: Vec<Oauth2Client>,
}

pub trait Handler {
    fn reduceb(super_type_id: TypeId, entries: Vec<ReduceEntry>) -> Result<TypeId, super::Error>;
    fn add_graphql_endpoint(graphql: String) -> Result<u32, super::Error>;
    fn add_auth(data: Auth) -> Result<u32, super::Error>;
    fn add_raw_auth(data: String) -> Result<u32, super::Error>;
    fn oauth2(params: BaseOauth2Params) -> Result<String, super::Error>;
    fn oauth2_without_profiler(params: BaseOauth2Params) -> Result<String, super::Error>;
    fn oauth2_with_extended_profiler(
        params: BaseOauth2Params,
        extension: String,
    ) -> Result<String, super::Error>;
    fn oauth2_with_custom_profiler(
        params: BaseOauth2Params,
        profiler: TypeId,
    ) -> Result<String, super::Error>;
    fn gql_deploy_query(params: QueryDeployParams) -> Result<String, super::Error>;
    fn gql_remove_query(tg_name: Vec<String>) -> Result<String, super::Error>;
    fn gql_ping_query() -> Result<String, super::Error>;
    fn metagen_exec(config: FdkConfig) -> Result<Vec<FdkOutput>, super::Error>;
    fn metagen_write_files(
        items: Vec<FdkOutput>,
        typegraph_dir: String,
    ) -> Result<(), super::Error>;
}
