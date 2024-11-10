// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

pub mod archive;
pub mod grpc;
pub mod typegraph;

// Note:
// try refactoring the typegraph deploy feature on both sdks
// once WebAssembly async and networking have matured enough
#[cfg(not(target_arch = "wasm32"))]
pub mod graphql;
#[cfg(not(target_arch = "wasm32"))]
pub mod node;
