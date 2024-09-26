pub use crate::wasm::core::Error;

pub type Result<T> = std::result::Result<T, Error>;

impl From<String> for Error {
    fn from(s: String) -> Self {
        Self { stack: vec![s] }
    }
}
