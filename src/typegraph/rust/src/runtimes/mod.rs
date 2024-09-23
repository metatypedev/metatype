pub mod http;
pub mod kv;
pub mod random;

use crate::wasm::runtimes::Effect;

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}
