// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use super::core::{MaterializerId, RuntimeId};
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

pub trait Handler {
    fn register_s3_runtime(data: S3RuntimeData) -> Result<RuntimeId, super::Error>;
    fn s3_presign_get(runtime: RuntimeId, data: S3PresignGetParams) -> Result<MaterializerId, super::Error>;
    fn s3_presign_put(runtime: RuntimeId, data: S3PresignPutParams) -> Result<MaterializerId, super::Error>;
    fn s3_list(runtime: RuntimeId, bucket: String) -> Result<MaterializerId, super::Error>;
    fn s3_upload(runtime: RuntimeId, bucket: String) -> Result<MaterializerId, super::Error>;
    fn s3_upload_all(runtime: RuntimeId, bucket: String) -> Result<MaterializerId, super::Error>;
}