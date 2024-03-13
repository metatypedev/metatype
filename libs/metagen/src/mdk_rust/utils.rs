// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use heck::ToPascalCase;

pub fn normalize_type_title(title: &str) -> String {
    title.to_pascal_case()
}
