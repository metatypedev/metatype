// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TemporalRuntimeData {
    pub name: String,
    pub host_secret: String,
    pub namespace_secret: Option<String>,
    // pub task_queue_secret: Option<String>,
}
