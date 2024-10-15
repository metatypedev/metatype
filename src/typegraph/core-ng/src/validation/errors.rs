// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use crate::wit::core::Error;

// pub fn invalid_runtime_type(runtime: &str, materializer: &str) -> Error {
//     format!(
//         "invalid runtime type {} for materializer {}",
//         runtime, materializer
//     )
// }

pub fn invalid_output_type_predefined(name: &str, expected: &str, got: &str) -> Error {
    format!(
        "invalid output type for predefined function {}: expected {}, got {}",
        name, expected, got
    )
    .into()
}

pub fn unknown_predefined_function(name: &str) -> Error {
    format!("unknown predefined function {}", name).into()
}
