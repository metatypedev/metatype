// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::{
    t::{self, TypeBuilder, TypeDef},
    wasm::{self, core::RuntimeId},
    Result,
};

pub use wasm::aws::{S3PresignGetParams, S3PresignPutParams, S3RuntimeData};

#[derive(Debug)]
pub struct S3Runtime {
    id: RuntimeId,
    #[allow(unused)]
    options: S3RuntimeData,
}

impl S3Runtime {
    pub fn new(options: S3RuntimeData) -> Result<Self> {
        let id = wasm::with_aws(|a, s| a.call_register_s3_runtime(s, &options))?;

        Ok(Self { id, options })
    }

    pub fn presign_get(&self, params: S3PresignGetParams) -> Result<TypeDef> {
        let mat = wasm::with_aws(|a, s| a.call_s3_presign_get(s, self.id, &params))?;
        let inp = t::r#struct().prop("path", t::string())?;
        let out = t::uri();

        t::func(inp, out, mat)?.build()
    }

    pub fn presign_put(&self, params: S3PresignPutParams) -> Result<TypeDef> {
        let mat = wasm::with_aws(|a, s| a.call_s3_presign_put(s, self.id, &params))?;
        let inp = t::r#struct()
            .prop("length", t::integer())?
            .prop("path", t::string())?;
        let out = t::uri();

        t::func(inp, out, mat)?.build()
    }

    pub fn list(&self, bucket: &str) -> Result<TypeDef> {
        let mat = wasm::with_aws(|a, s| a.call_s3_list(s, self.id, bucket))?;
        let inp = t::r#struct().prop("path", t::string().optional());
        let key = t::r#struct()
            .prop("key", t::string())?
            .prop("size", t::integer());
        let out = t::r#struct()
            .prop("keys", t::list(key))?
            .prop("prefix", t::list(t::string()));

        t::func(inp, out, mat)?.build()
    }

    pub fn upload(&self, bucket: &str, file_type: impl TypeBuilder) -> Result<TypeDef> {
        let mat = wasm::with_aws(|a, s| a.call_s3_upload(s, self.id, bucket))?;
        let inp = t::r#struct()
            .prop("file", file_type)?
            .prop("path", t::string().optional());
        let out = t::boolean();

        t::func(inp, out, mat)?.build()
    }

    pub fn upload_all(&self, bucket: &str, file_type: impl TypeBuilder) -> Result<TypeDef> {
        let mat = wasm::with_aws(|a, s| a.call_s3_upload_all(s, self.id, bucket))?;
        let inp = t::r#struct()
            .prop("prefix", t::string().optional_or(""))?
            .prop("files", t::list(file_type));
        let out = t::boolean();

        t::func(inp, out, mat)?.build()
    }
}
