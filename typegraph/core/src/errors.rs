// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::Error as TgError;

pub type Result<T, E = TgError> = std::result::Result<T, E>;

pub fn invalid_max_value() -> TgError {
    "min must be less than or equal to max".to_string()
}

pub fn duplicate_key(name: &str) -> TgError {
    format!("duplicate key '{name}' in properties")
}

pub fn invalid_prop_key(name: &str) -> TgError {
    format!(
        "'{name}' is not a valid property key: allowed characters are ascii letters and underscores",
    )
}

// pub fn property_not_found_in(ty: &str, prop_name: &str) -> TgError {
//     format!("property '{prop_name}' not found in type '{ty}'")
// }

pub fn invalid_input_type(got: &str) -> TgError {
    format!("expected a Struct as input type but got {got}")
}

pub fn invalid_type(expected: &str, got: &str) -> TgError {
    format!("expected {expected} but got {got}")
}

pub fn nested_typegraph_context(active: &str) -> TgError {
    format!("cannot init typegraph: typegraph '{active}' is still active")
}

pub fn expected_typegraph_context() -> TgError {
    "no active typegraph context".to_string()
}

pub fn invalid_export_type(name: &str, got: &str) -> TgError {
    format!("expected a Func to be exposed, got {got} under the name '{name}'")
}

pub fn invalid_export_name(name: &str) -> TgError {
    format!("invalid export name '{name}': allowed characters are ascii letters and underscores")
}

pub fn duplicate_export_name(name: &str) -> TgError {
    format!("duplicate export name '{name}'")
}

pub fn unregistered_type_name(name: &str) -> TgError {
    format!("type name '{name}' has not been registered")
}

pub fn object_not_found(kind: &str, id: u32) -> TgError {
    format!("{kind} #{id} not found")
}

pub fn invalid_path(pos: usize, path: &[String], curr_keys: &[String]) -> TgError {
    let mut path_with_cursor = vec![];
    for (i, chunk) in path.iter().enumerate() {
        if i == pos {
            path_with_cursor.push(format!("[{}]", chunk));
        } else {
            path_with_cursor.push(chunk.clone());
        }
    }
    format!(
        "invalid path {:?}, none of {} match the chunk {:?}",
        path_with_cursor.join("."),
        curr_keys.join(", "),
        path.get(pos).unwrap_or(&"".to_string()),
    )
}

pub fn expect_object_at_path(path: &[String]) -> TgError {
    format!("object was expected at path {:?}", path.join("."))
}

pub fn unknown_predefined_function(name: &str, runtime: &str) -> TgError {
    format!("unknown predefined function {name} for runtime {runtime}")
}

pub fn duplicate_policy_name(name: &str) -> TgError {
    format!("duplicate policy name '{name}'")
}

pub fn base_required(name: &str) -> TgError {
    format!("Concrete type '{name}' must have a base.")
}

pub fn base_not_allowed(name: &str) -> TgError {
    format!("Wrapper type '{name}' must not have a base.")
}
