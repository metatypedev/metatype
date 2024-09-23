pub mod grpc;
pub mod http;
pub mod kv;
pub mod random;
pub mod wasm;

use crate::wasm::runtimes::Effect;

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}
