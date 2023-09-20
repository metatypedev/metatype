// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

#[derive(Debug)]
pub enum TemporalMaterializer {
    Start { workflow_type: String },
    Signal { signal_name: String },
    Query { query_type: String },
    Describe,
}
