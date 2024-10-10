// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::Serialize;

pub fn json_stringify<S>(value: &S) -> String
where
    S: Serialize + ?Sized,
{
    serde_json::to_string(value).unwrap()
}
