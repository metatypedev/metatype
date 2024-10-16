// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3RuntimeData {
    pub host_secret: String,
    pub region_secret: String,
    pub access_key_secret: String,
    pub secret_key_secret: String,
    pub path_style_secret: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3PresignGetParams {
    pub bucket: String,
    pub expiry_secs: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3PresignPutParams {
    pub bucket: String,
    pub expiry_secs: Option<u32>,
    pub content_type: Option<String>,
}
