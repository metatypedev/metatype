use crate::wit::core::Error;

pub fn relationship_not_found(source_model: &str, field: &str) -> Error {
    format!("relationship target not found for  {source_model}::{field}")
}
