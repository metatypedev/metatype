pub mod aws;
pub mod core;
pub mod runtimes;
pub mod utils;

use enum_dispatch::enum_dispatch;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::errors::Result;

#[enum_dispatch]
pub trait RpcDispatch {
    fn dispatch(self) -> Result<Value>;
}

#[derive(Debug, Serialize, Deserialize)]
#[enum_dispatch(RpcDispatch)]
#[serde(untagged)]
pub enum RpcCall {
    Aws(aws::RpcCall),
    Core(core::RpcCall),
    Utils(utils::RpcCall),
    Runtimes(runtimes::RpcCall),
}
