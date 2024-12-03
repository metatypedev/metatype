// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::sdk::aws::*;
#[allow(unused)]
use typegraph_core::sdk::core::{MaterializerId, RuntimeId};
use typegraph_core::{errors::Result, Lib};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all = "snake_case")]
pub enum RpcCall {
    RegisterS3Runtime {
        data: S3RuntimeData,
    },
    S3PresignGet {
        runtime: RuntimeId,
        data: S3PresignGetParams,
    },
    S3PresignPut {
        runtime: RuntimeId,
        data: S3PresignPutParams,
    },
    S3List {
        runtime: RuntimeId,
        bucket: String,
    },
    S3Upload {
        runtime: RuntimeId,
        bucket: String,
    },
    S3UploadAll {
        runtime: RuntimeId,
        bucket: String,
    },
}

impl super::RpcDispatch for RpcCall {
    fn dispatch(self) -> Result<Value> {
        match self {
            Self::RegisterS3Runtime { data } => {
                Lib::register_s3_runtime(data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::S3PresignGet { runtime, data } => {
                Lib::s3_presign_get(runtime, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::S3PresignPut { runtime, data } => {
                Lib::s3_presign_put(runtime, data).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::S3List { runtime, bucket } => {
                Lib::s3_list(runtime, bucket).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::S3Upload { runtime, bucket } => {
                Lib::s3_upload(runtime, bucket).map(|res| serde_json::to_value(res).unwrap())
            }
            Self::S3UploadAll { runtime, bucket } => {
                Lib::s3_upload_all(runtime, bucket).map(|res| serde_json::to_value(res).unwrap())
            }
        }
    }
}
