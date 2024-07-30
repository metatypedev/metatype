// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KvRuntimeData {
    pub host: Option<String>,
    pub port: Option<String>,
    pub db_number: Option<u8>,
    pub password: Option<String>,
}
