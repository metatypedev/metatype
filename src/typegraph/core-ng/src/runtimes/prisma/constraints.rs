// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::errors::Result;
use crate::runtimes::prisma::type_utils::RuntimeConfig;

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
