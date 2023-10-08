// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use std::rc::Rc;

use crate::conversion::runtimes::MaterializerConverter;
use crate::errors::Result;
use crate::global_store::Store;
use crate::typegraph::TypegraphContext;
use crate::wit::aws::{
    MaterializerId, RuntimeId, S3PresignGetParams, S3PresignPutParams, S3RuntimeData,
};
use crate::wit::runtimes::Effect as WitEffect;
use crate::wit::runtimes::Effect;
use serde::Serialize;

use super::{Materializer, Runtime};

#[derive(Debug, Serialize)]
pub struct S3PresignGetMat {
    pub bucket: String,
    pub expiry_secs: Option<u32>,
}

impl From<S3PresignGetParams> for S3PresignGetMat {
    fn from(params: S3PresignGetParams) -> Self {
        Self {
            bucket: params.bucket,
            expiry_secs: params.expiry_secs,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct S3PresignPutMat {
    pub bucket: String,
    pub content_type: Option<String>,
    pub expiry_secs: Option<u32>,
}

impl From<S3PresignPutParams> for S3PresignPutMat {
    fn from(params: S3PresignPutParams) -> Self {
        Self {
            bucket: params.bucket,
            content_type: params.content_type,
            expiry_secs: params.expiry_secs,
        }
    }
}

impl Materializer {
    fn s3(runtime_id: RuntimeId, data: S3Materializer, effect: WitEffect) -> Self {
        Self {
            runtime_id,
            data: Rc::new(data).into(),
            effect,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct S3ListItemsMat {
    pub bucket: String,
}

#[derive(Debug, Serialize)]
pub struct S3UploadMat {
    pub bucket: String,
}

#[derive(Debug)]
pub enum S3Materializer {
    PresignGet(S3PresignGetMat),
    PresignPut(S3PresignPutMat),
    List(S3ListItemsMat),
    Upload(S3UploadMat),
    UploadAll(S3UploadMat),
}

impl MaterializerConverter for S3Materializer {
    fn convert(
        &self,
        c: &mut TypegraphContext,
        runtime_id: u32,
        effect: Effect,
    ) -> Result<common::typegraph::Materializer> {
        use S3Materializer as M;

        let runtime = c.register_runtime(runtime_id)?;

        let (name, data): (&'static str, serde_json::Value) = match self {
            M::PresignGet(params) => (
                "presign_get",
                serde_json::to_value(params).map_err(|e| e.to_string())?,
            ),
            M::PresignPut(params) => (
                "presign_put",
                serde_json::to_value(params).map_err(|e| e.to_string())?,
            ),
            M::List(params) => (
                "list",
                serde_json::to_value(params).map_err(|e| e.to_string())?,
            ),
            M::Upload(params) => (
                "upload",
                serde_json::to_value(params).map_err(|e| e.to_string())?,
            ),
            M::UploadAll(params) => (
                "upload_all",
                serde_json::to_value(params).map_err(|e| e.to_string())?,
            ),
        };

        Ok(common::typegraph::Materializer {
            name: name.to_string(),
            runtime,
            effect: effect.into(),
            data: serde_json::from_value(data).map_err(|e| e.to_string())?,
        })
    }
}

impl crate::wit::aws::Guest for crate::Lib {
    fn register_s3_runtime(data: S3RuntimeData) -> Result<RuntimeId> {
        Ok(Store::register_runtime(Runtime::S3(data.into())))
    }

    fn s3_presign_get(runtime: RuntimeId, params: S3PresignGetParams) -> Result<MaterializerId> {
        let mat = Materializer::s3(
            runtime,
            S3Materializer::PresignGet(params.into()),
            WitEffect::None,
        );
        Ok(Store::register_materializer(mat))
    }

    fn s3_presign_put(runtime: RuntimeId, params: S3PresignPutParams) -> Result<MaterializerId> {
        let mat = Materializer::s3(
            runtime,
            S3Materializer::PresignPut(params.into()),
            WitEffect::None,
        );
        Ok(Store::register_materializer(mat))
    }

    fn s3_list(runtime: RuntimeId, bucket: String) -> Result<MaterializerId> {
        let mat = Materializer::s3(
            runtime,
            S3Materializer::List(S3ListItemsMat { bucket }),
            WitEffect::None,
        );
        Ok(Store::register_materializer(mat))
    }

    fn s3_upload(runtime: RuntimeId, bucket: String) -> Result<MaterializerId> {
        let mat = Materializer::s3(
            runtime,
            S3Materializer::Upload(S3UploadMat { bucket }),
            WitEffect::Create(true),
        );
        Ok(Store::register_materializer(mat))
    }

    fn s3_upload_all(runtime: RuntimeId, bucket: String) -> Result<MaterializerId> {
        let mat = Materializer::s3(
            runtime,
            S3Materializer::UploadAll(S3UploadMat { bucket }),
            WitEffect::Create(true),
        );
        Ok(Store::register_materializer(mat))
    }
}
