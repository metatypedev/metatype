// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use indexmap::IndexMap;
#[cfg(feature = "codegen")]
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use serde_with::skip_serializing_none;

pub mod deno {
    use super::*;

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
    pub struct DenoRuntimeData {
        worker: String,
        permissions: IndexMap<String, Value>,
    }
}

pub mod http {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct HTTPRuntimeData {
        pub endpoint: String, // URL
        pub cert_secret: Option<String>,
        pub basic_auth_secret: Option<String>,
    }
}

pub mod graphql {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct GraphQLRuntimeData {
        pub endpoint: String, // url??
    }
}

pub mod prisma {
    use super::*;

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
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub enum Cardinality {
        Optional, // 0..1
        One,      // 1..1
        Many,     // 0..*
    }

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct RelationshipModel {
        pub type_idx: u32,
        // field of this model pointing to the other model
        // ? what about multi-field relationships?
        pub field: String,
        pub cardinality: Cardinality,
    }

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct Relationship {
        name: String,
        left: RelationshipModel,
        right: RelationshipModel,
    }

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[skip_serializing_none]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct PrismaRuntimeData {
        pub name: String,
        pub datamodel: Option<String>, // to be set by a hook on the typegate
        pub connection_string_secret: String,
        pub models: Vec<u32>,
        pub relationships: Vec<Relationship>,
        // if migration_options is not None: migrations will be applied on push
        #[serde(default)]
        pub migration_options: Option<MigrationOptions>,
    }
}

pub mod random {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct RandomRuntimeData {
        pub seed: u32,
        pub reset: Option<String>,
    }
}

pub mod s3 {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[skip_serializing_none]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct S3RuntimeData {
        pub host_secret: String,
        pub region_secret: String,
        pub access_key_secret: String,
        pub secret_key_secret: String,
        pub path_style_secret: String,
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
        UploadAll {
            bucket: String,
        },
    }
}

pub mod temporal {
    use super::*;

    #[cfg_attr(feature = "codegen", derive(JsonSchema))]
    #[derive(Serialize, Deserialize, Clone, Debug)]
    pub struct TemporalRuntimeData {
        pub name: String,
        pub host: String,
    }
}
