// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HTTPRuntimeData {
    pub endpoint: String, // URL
    pub cert_secret: Option<String>,
    pub basic_auth_secret: Option<String>,
}
