// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub use common::typegraph::runtimes::prisma::{ScalarType, StringType};
use indexmap::IndexMap;

use crate::errors::Result;
use crate::runtimes::prisma::errors;
use crate::runtimes::prisma::relationship::Cardinality;
use crate::runtimes::prisma::type_utils::RuntimeConfig;
use crate::types::TypeDefExt;

use super::model::Property;

fn find_as_id_field(type_name: &str, props: &IndexMap<String, Property>) -> Result<Option<String>> {
    let as_id_fields = props
        .iter()
        .filter_map(|(k, p)| match p {
            Property::Scalar(prop) => match prop.quantifier {
                Cardinality::One => prop
                    .type_id
                    .as_type_def()
                    .unwrap()
                    .unwrap()
                    .base()
                    .as_id
                    .then(|| k.clone()),
                _ => None,
            },
            _ => None,
        })
        .collect::<Vec<_>>();

    match as_id_fields.len() {
        0..=1 => Ok(as_id_fields.into_iter().next()),
        _ => Err(errors::multiple_id_fields(type_name)),
    }
}

fn find_id_part_fields(
    type_name: &str,
    props: &IndexMap<String, Property>,
) -> Result<Option<Vec<String>>> {
    let id_part_fields = props
        .iter()
        .filter_map(|(k, p)| match p {
            Property::Scalar(prop) => match prop.quantifier {
                Cardinality::One => {
                    let typedef = prop.type_id.as_type_def().unwrap().unwrap();
                    let runtime_config = RuntimeConfig::new(typedef.base().runtime_config.as_ref());
                    let id_part = runtime_config
                        .get("id_part")
                        .ok()
                        .flatten()
                        .unwrap_or(false);
                    id_part.then(|| k.clone())
                }
                _ => None,
            },
            _ => None,
        })
        .collect::<Vec<_>>();

    match id_part_fields.len() {
        0 => Ok(None),
        1 => Err(format!("expected more than one id_part fields on the model {type_name}").into()),
        _ => Ok(Some(id_part_fields)),
    }
}

fn find_struct_level_ids(
    type_name: &str,
    config: &RuntimeConfig<'_>,
    props: &IndexMap<String, Property>,
) -> Result<Option<Vec<String>>> {
    let id_config: Option<Vec<String>> = config.get("id").ok().flatten();

    let Some(id_config) = id_config else {
        return Ok(None);
    };

    if id_config.is_empty() {
        return Err("id config must not be empty".into());
    }

    for id_field in &id_config {
        let prop = props
            .get(id_field)
            .ok_or_else(|| format!("id field {} not found", id_field))?;
        match prop {
            Property::Scalar(prop) => match prop.quantifier {
                Cardinality::One => continue,
                Cardinality::Optional => {
                    return Err(format!(
                        "id field {} must not be optional in model {type_name}",
                        id_field
                    )
                    .into())
                }
                Cardinality::Many => {
                    return Err(format!(
                        "id field {} must not be a list in model {type_name}",
                        id_field
                    )
                    .into())
                }
            },
            Property::Model(prop) => match prop.quantifier {
                Cardinality::One => continue,
                Cardinality::Optional => {
                    return Err(format!(
                        "id field {} must not be optional in model {type_name}",
                        id_field
                    )
                    .into())
                }
                Cardinality::Many => {
                    return Err(format!(
                        "id field {} must not be a list in model {type_name}",
                        id_field
                    )
                    .into())
                }
            },
            Property::Unmanaged(_) => {
                // TODO
                return Err(format!(
                    "unexpected id on unmanaged field {} in model {type_name}",
                    id_field
                )
                .into());
            }
        }
    }

    Ok(Some(id_config))
}

pub fn find_id_fields(
    type_name: &str,
    props: &IndexMap<String, Property>,
    config: &RuntimeConfig<'_>,
) -> Result<Vec<String>> {
    let as_id_field = find_as_id_field(type_name, props)?;
    let id_part_fields = find_id_part_fields(type_name, props)?;
    let struct_id_fields = find_struct_level_ids(type_name, config, props)?;

    match (as_id_field, id_part_fields, struct_id_fields) {
        (None, None, None) => Err(errors::id_field_not_found(type_name)),
        (Some(as_id_field), None, None) => Ok(vec![as_id_field]),
        (None, Some(id_part_fields), None) => Ok(id_part_fields),
        (None, None, Some(struct_id_fields)) => Ok(struct_id_fields),
        (_, _, _) => Err("id_part, as_id and struct-level ids are mutually exclusive"
            .to_string()
            .into()),
    }
}

pub fn get_struct_level_unique_constraints(
    type_name: &str,
    config: &RuntimeConfig<'_>,
) -> Result<Vec<Vec<String>>> {
    let unique_config: Option<Vec<Vec<String>>> = config.get("unique").ok().flatten();

    let Some(unique_config) = unique_config else {
        return Ok(vec![]);
    };

    for unique_fields in &unique_config {
        if unique_fields.is_empty() {
            return Err(format!("unexpected empty unique constraint in model {type_name}").into());
        }
    }

    Ok(unique_config)
}
