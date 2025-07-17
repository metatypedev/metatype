// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};
use serde_json::Value;
#[allow(unused)]
use typegraph_core::sdk::core::TypeId;
use typegraph_core::sdk::utils::*;
use typegraph_core::{errors::Result, Lib};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all = "snake_case")]
pub enum RpcCall {
    Reduceb {
        super_type_id: TypeId,
        entries: Vec<ReduceEntry>,
    },
    AddGraphqlEndpoint {
        graphql: String,
    },
    AddAuth {
        data: Auth,
    },
    AddRawAuth {
        data: String,
    },
    Oauth2 {
        params: BaseOauth2Params,
    },
    Oauth2WithoutProfiler {
        params: BaseOauth2Params,
    },
    Oauth2WithExtendedProfiler {
        params: BaseOauth2Params,
        extension: String,
    },
    Oauth2WithCustomProfiler {
        params: BaseOauth2Params,
        profiler: TypeId,
    },
    GqlDeployQuery {
        params: QueryDeployParams,
    },
    GqlRemoveQuery {
        tg_name: Vec<String>,
    },
    GqlPingQuery,
    MetagenExec {
        config: FdkConfig,
    },
    MetagenWriteFiles {
        items: Vec<FdkOutput>,
        typegraph_dir: String,
    },
}

impl super::RpcDispatch for RpcCall {
    fn dispatch(self) -> Result<Value> {
        match self {
            Self::Reduceb {
                super_type_id,
                entries,
            } => Lib::reduceb(super_type_id, entries).map(|res| serde_json::to_value(res).unwrap()),
            Self::AddGraphqlEndpoint { graphql } => {
                Lib::add_graphql_endpoint(graphql).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::AddAuth { data } => {
                Lib::add_auth(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::AddRawAuth { data } => {
                Lib::add_raw_auth(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::Oauth2 { params } => {
                Lib::oauth2(params).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::Oauth2WithoutProfiler { params } => {
                Lib::oauth2_without_profiler(params).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::Oauth2WithExtendedProfiler { params, extension } => {
                Lib::oauth2_with_extended_profiler(params, extension)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::Oauth2WithCustomProfiler { params, profiler } => {
                Lib::oauth2_with_custom_profiler(params, profiler)
                    .map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GqlDeployQuery { params } => {
                Lib::gql_deploy_query(params).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GqlRemoveQuery { tg_name } => {
                Lib::gql_remove_query(tg_name).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::GqlPingQuery => {
                Lib::gql_ping_query().map(|res| serde_json::to_value(res).unwrap())
            }
            Self::MetagenExec { config } => {
                Lib::metagen_exec(config).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::MetagenWriteFiles {
                items,
                typegraph_dir,
            } => Lib::metagen_write_files(items, typegraph_dir)
                .map(|res| serde_json::to_value(res).unwrap()),
        }
    }
}
