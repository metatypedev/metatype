use serde::{Deserialize, Serialize};
use serde_json::Value;
use typegraph_core::{
    types::{aws::*, core::RuntimeId},
    Result,
};

use super::TypegraphFunc;

#[rustfmt::skip]
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "method", content = "params")]
pub enum AwsCall {
    RegisterS3Runtime { data: S3RuntimeData },
    S3PresignGet { runtime: RuntimeId, data: S3PresignGetParams },
    S3PresignPut { runtime: RuntimeId, data: S3PresignPutParams },
    S3List { runtime: RuntimeId, bucket: String },
    S3Upload { runtime: RuntimeId, bucket: String },
    S3UploadAll { runtime: RuntimeId, bucket: String },
}

impl TypegraphFunc for AwsCall {
    fn execute(self) -> Result<Value> {
        todo!()
    }
}
