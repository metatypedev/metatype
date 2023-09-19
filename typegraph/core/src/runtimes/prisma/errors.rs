// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::Error;

// pub fn relationship_not_found(source_model: &str, field: &str) -> Error {
//     format!("relationship target not found for  {source_model}::{field}")
// }

pub fn ambiguous_side(first_model: &str, second_model: &str) -> Error {
    [
        "Ambiguous side:",
        "cannot determine which model should have the foreign key:",
        &format!("{:?} or {:?}", first_model, second_model),
        "Please add 'fkey' or 'unique' attribute on one side",
    ]
    .join(" ")
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
}
