use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::{
    types::{core::TypeId, utils::*},
    Result,
};

use super::TypegraphFunc;

#[rustfmt::skip]
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum UtilsCall {
    GenReduceb { supertype_id: TypeId, data: Reduce },
    AddGraphqlEndpoint { graphql: String },
    AddAuth { data: Auth },
    AddRawAuth { data: String },
    Oauth2 { service_name: String, scopes: String },
    Oauth2WithoutProfiler { service_name: String, scopes: String },
    Oauth2WithExtendedProfiler { service_name: String, scopes: String, extension: String },
    Oauth2WithCustomProfiler { service_name: String, scopes: String, profiler: TypeId },
    GqlDeployQuery { params: QueryDeployParams },
    GqlRemoveQuery { tg_name: Vec<String> },
    MetagenExec { config: FdkConfig },
    MetagenWriteFiles { items: Vec<FdkOutput>, typegraph_dir: String },
}

impl TypegraphFunc for UtilsCall {
    fn execute(self) -> Result<Value> {
        todo!()
    }
}
