// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::Error;

// pub fn relationship_not_found(source_model: &str, field: &str) -> Error {
//     format!("relationship target not found for  {source_model}::{field}")
// }

pub fn ambiguous_side(
    first_model: &str,
    first_field: &str,
    second_model: &str,
    second_field: &str,
) -> Error {
    [
        "Ambiguous side:",
        "cannot determine which model should have the foreign key:",
        &format!(
            "{}::{} or {}::{}",
            first_model, first_field, second_model, second_field
        ),
        "Please add 'fkey' or 'unique' attribute on one side",
    ]
    .join(" ")
    .into()
}

pub fn conflicting_attributes(
    attribute: &str,
    first_model: &str,
    first_field: &str,
    second_model: &str,
    second_field: &str,
) -> Error {
    [
        format!("Conflicting attributes '{attribute}':"),
        format!("on {first_model}::{first_field}"),
        format!("and {second_model}::{second_field}"),
    ]
    .join(" ")
    .into()
}

pub fn no_relationship_target(model: &str, field: &str, target_model: &str) -> Error {
    format!(r#"Relationship target field not found for "{model}::{field}" on {target_model:?}."#)
        .into()
}
