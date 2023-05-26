// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub fn invalid_max_value() -> String {
    "min must be less than max".to_string()
}

pub fn duplicate_key(name: &str) -> String {
    format!("duplicate key '{name}' in properties")
}

pub fn invalid_prop_key(name: &str) -> String {
    format!(
        "'{name}' is not a valid property key: allowed characters are ascii letters and underscores",
    )
}

pub fn invalid_input_type(got: &str) -> String {
    format!("expected a Struct as input type but got {got}")
}

pub fn nested_typegraph_context(active: &str) -> String {
    format!("cannot init typegraph: typegraph '{active}' is still active")
}

pub fn expected_typegraph_context() -> String {
    "no active typegraph context".to_string()
}

pub fn invalid_export_type(name: &str, got: &str) -> String {
    format!("expected a Func to be exposed, got {got} under the name '{name}'")
}

pub fn invalid_export_name(name: &str) -> String {
    format!("invalid export name '{name}': allowed characters are ascii letters and underscores")
}

pub fn duplicate_export_name(name: &str) -> String {
    format!("duplicate export name '{name}'")
}

pub fn type_not_found(id: u32, size: usize) -> String {
    format!("type #{id} not found; types.len() == {size}")
}
