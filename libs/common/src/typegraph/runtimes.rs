// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_with::skip_serializing_none;

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionMatData {
    pub script: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModuleMatData {
    pub code: String,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MigrationOptions {
    pub migration_files: Option<String>,
    // enable migration creation
    // otherwise, a non-empty diff will make the push fail
    pub create: bool,
    // reset the database if required
    pub reset: bool,
}

#[cfg_attr(feature = "codegen", derive(JsonSchema))]
#[skip_serializing_none]
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrismaRuntimeData {
    pub name: String,
    pub datamodel: String,
    pub connection_string_secret: String,
    pub models: Vec<u32>,
    // if migration_options is not None: migrations will be applied on push
    #[serde(default)]
    pub migration_options: Option<MigrationOptions>,
}

pub mod s3 {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[skip_serializing_none]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct S3RuntimeData {
        pub host: String,
        pub region: String,
        pub access_key_secret: String,
        pub secret_key_secret: String,
        pub path_style: bool,
    }

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
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
    }
}
