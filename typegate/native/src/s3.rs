// Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

use deno_bindgen::deno_bindgen;
use http::header::{self};
use http::HeaderMap;
use s3::bucket::Bucket;
use s3::creds::Credentials;
use s3::Region;

use crate::RT;

#[derive(Debug)]
#[deno_bindgen]
struct S3Client {
    region: String,
    access_key: String,
    secret_key: String,
    endpoint: String,
}

#[derive(Debug)]
#[deno_bindgen]
struct S3Presigning {
    bucket: String,
    key: String,
    content_type: String,
    content_length: String,
    expires: u32,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn s3_presign_put(client: S3Client, presigning: S3Presigning) -> String {
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
    let mut bucket = Bucket::new(&presigning.bucket, region, credentials).unwrap();
    bucket.set_path_style();
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        presigning.content_type.parse().unwrap(),
    );
    headers.insert(
        header::CONTENT_LENGTH,
        presigning.content_length.parse().unwrap(),
    );
    bucket
        .presign_put(presigning.key, presigning.expires, Some(headers))
        .unwrap()
}

#[derive(Debug)]
#[deno_bindgen]
struct S3Item {
    key: String,
    size: u64,
}

#[derive(Debug)]
#[deno_bindgen]
struct S3Items {
    prefix: Vec<String>,
    items: Vec<S3Item>,
}

#[cfg_attr(not(test), deno_bindgen(non_blocking))]
fn s3_list(client: S3Client, bucket: &str, path: &str) -> S3Items {
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
    let mut bucket = Bucket::new(bucket, region, credentials).unwrap();
    bucket.set_path_style();
    let ls = RT
        .block_on(bucket.list(path.to_string(), Some("/".to_string())))
        .unwrap();
    S3Items {
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
    }
}
