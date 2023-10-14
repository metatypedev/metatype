// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::{types::TypeId, wit::core::Error};

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

pub fn no_relationship_target(model: &str, field: &str, target_model: &str) -> Error {
    format!(r#"Relationship target field not found for "{model}::{field}" on {target_model:?}."#)
}

pub fn unnamed_model(repr: &str) -> Error {
    format!("Prisma model must have a name: {repr}")
}

pub fn multiple_id_fields(model: &str) -> Error {
    format!("Multiple id fields are not yet supported: model {model}")
}

pub fn id_field_not_found(model: &str) -> Error {
    format!("Id field not found: model {model}")
}

pub fn unregistered_model(type_id: TypeId) -> Error {
    format!("Model not registered: {}", type_id.repr().unwrap())
}

#[allow(dead_code)]
pub(crate) fn unregistered_prop(key: &str, type_name: &str) -> Error {
    format!("Property not registered: {}.{}", type_name, key)
}

pub fn unregistered_relationship(type_name: &str, prop_name: &str) -> Error {
    format!("Relationship not registered: {}::{}", type_name, prop_name)
}
