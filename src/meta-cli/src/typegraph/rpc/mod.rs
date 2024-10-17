mod aws;
mod core;
mod runtimes;
mod utils;

use enum_dispatch::enum_dispatch;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::Result;

#[enum_dispatch]
pub trait TypegraphFunc {
    fn execute(&self) -> Result<Value>;
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(untagged)]
#[enum_dispatch(TypegraphFunc)]
pub enum TypegraphRpcCall {
    Core(core::CoreCall),
    Runtimes(runtimes::RuntimeCall),
    Aws(aws::AwsCall),
    Utils(utils::UtilsCall),
}
