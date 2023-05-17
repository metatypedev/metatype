// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

use crate::RT;
use http::header;
use http::{HeaderMap, HeaderValue};
use log::error;
use macros::deno;
use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::error::S3Error;
use s3::Region;
use tap::TapFallible;

#[deno]
struct S3Client {
    region: String,
    access_key: String,
    secret_key: String,
    endpoint: String,
}

fn create_bucket(client: S3Client, bucket: &str) -> Result<Bucket, S3Error> {
    let region = Region::Custom {
        region: client.region,
        endpoint: client.endpoint,
    };
    let credentials = Credentials {
        access_key: Some(client.access_key),
        secret_key: Some(client.secret_key),
        security_token: None,
        session_token: None,
        expiration: None,
    };

    Bucket::new(bucket, region, credentials)
}

#[deno]
struct S3Presigning {
    bucket: String,
    key: String,
    content_type: String,
    content_length: String,
    expires: u32,
}

#[deno]
enum S3PresigningOut {
    Ok { res: String },
    Err { message: String },
}

#[deno]
fn s3_presign_put(client: S3Client, presigning: S3Presigning) -> S3PresigningOut {
    let mut bucket = match create_bucket(client, &presigning.bucket) {
        Ok(bucket) => bucket,
        Err(e) => {
            return S3PresigningOut::Err {
                message: e.to_string(),
            };
        }
    };

    bucket.set_path_style();
    let mut headers = HeaderMap::new();

    // Note :
    // Only visible ASCII characters (32-127) are permitted

    match HeaderValue::from_str(&presigning.content_type) {
        Ok(ctype) => {
            headers.insert(header::CONTENT_TYPE, ctype);
        }
        Err(e) => {
            return S3PresigningOut::Err {
                message: e.to_string(),
            };
        }
    }

    match HeaderValue::from_str(&presigning.content_length) {
        Ok(clength) => {
            headers.insert(header::CONTENT_LENGTH, clength);
        }
        Err(e) => {
            return S3PresigningOut::Err {
                message: e.to_string(),
            };
        }
    }

    match bucket.presign_put(presigning.key, presigning.expires, Some(headers)) {
        Ok(res) => S3PresigningOut::Ok { res },
        Err(e) => S3PresigningOut::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct S3Item {
    key: String,
    size: u64,
}

#[deno]
enum S3Items {
    Ok {
        prefix: Vec<String>,
        items: Vec<S3Item>,
    },
    Err {
        message: String,
    },
}

#[deno]
fn s3_list(client: S3Client, bucket: &str, path: &str) -> S3Items {
    let mut bucket = match create_bucket(client, bucket) {
        Ok(bucket) => bucket,
        Err(e) => {
            return S3Items::Err {
                message: e.to_string(),
            };
        }
    };

    bucket.set_path_style();

    let temp = RT.block_on(bucket.list(path.to_string(), Some("/".to_string())));

    match temp {
        Ok(ls) => S3Items::Ok {
            prefix: ls
                .clone()
                .into_iter()
                .flat_map(|page| page.common_prefixes.unwrap_or_default())
                .map(|e| e.prefix)
                .collect(),
            items: ls
                .into_iter()
                .flat_map(|page| page.contents)
                .map(|e| S3Item {
                    key: e.key,
                    size: e.size,
                })
                .collect(),
        },
        Err(e) => S3Items::Err {
            message: e.to_string(),
        },
    }
}

#[deno]
struct S3Upload {
    key: String,
}

#[deno]
enum S3UploadedFile {
    Ok { key: String },
    Err { message: String },
}

#[deno]
fn s3_upload(client: S3Client, bucket: &str, key: &str, file: &[u8]) -> S3UploadedFile {
    let mut bucket = match create_bucket(client, bucket).tap_err(|e| error!("{e:?}")) {
        Ok(bucket) => bucket,
        Err(e) => {
            return S3UploadedFile::Err {
                message: e.to_string(),
            }
        }
    };

    bucket.set_path_style();

    let temp = RT.block_on(bucket.put_object(key, file));

    match temp.tap_err(|e| error!("{e:?}")) {
        Ok(_res) => S3UploadedFile::Ok {
            key: key.to_string(),
        },
        Err(e) => S3UploadedFile::Err {
            message: e.to_string(),
        },
    }
}
