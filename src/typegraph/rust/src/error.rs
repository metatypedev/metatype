pub use crate::wasm::core::Error;

pub type Result<T> = std::result::Result<T, Error>;
