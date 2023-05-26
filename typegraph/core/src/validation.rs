// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use once_cell::sync::Lazy;
use regex::Regex;

static NAME_REGEX: Lazy<Regex> = Lazy::new(|| Regex::new(r"^[_a-zA-Z0-9]+$").unwrap());

pub fn validate_name(name: &str) -> bool {
    NAME_REGEX.is_match(name)
}
