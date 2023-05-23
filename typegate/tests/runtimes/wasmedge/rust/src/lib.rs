// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

#[allow(unused_imports)]
use wasmedge_bindgen::*;
use wasmedge_bindgen_macro::wasmedge_bindgen;

#[wasmedge_bindgen]
pub fn add(a: f64, b: f64) -> i64 {
    return (a + b).round() as i64;
}
