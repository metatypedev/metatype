pub mod http;

use crate::wasm::runtimes::Effect;

impl Default for Effect {
    fn default() -> Self {
        Self::Read
    }
}
