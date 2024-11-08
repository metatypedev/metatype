// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct S3RuntimeData {
    pub host_secret: String,
    pub region_secret: String,
    pub access_key_secret: String,
    pub secret_key_secret: String,
    pub path_style_secret: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "name", content = "data", rename_all = "snake_case")]
pub enum S3Materializer {
    PresignGet {
        bucket: String,
        expiry_secs: Option<usize>,
    },
    PresignPut {
        bucket: String,
        content_type: Option<String>,
        expiry_secs: Option<usize>,
    },
    List {
        bucket: String,
    },
    Upload {
        bucket: String,
    },
    UploadAll {
        bucket: String,
    },
}
