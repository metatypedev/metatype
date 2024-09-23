pub mod http;
pub mod kv;

use crate::wasm::runtimes::Effect;

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}
