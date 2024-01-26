// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

pub mod archive;
pub mod typegraph;

// Note:
// try refactoring the typegraph deploy feature and refactor redundant code on both sdks
// once WebAssembly async and networking has matured enough
#[cfg(not(target_arch = "wasm32"))]
pub mod graphql;
#[cfg(not(target_arch = "wasm32"))]
pub mod node;
