#[derive(Debug, Clone)]
pub struct S3RuntimeData {
    pub host_secret: String,
    pub region_secret: String,
    pub access_key_secret: String,
    pub secret_key_secret: String,
    pub path_style_secret: String,
}

#[derive(Debug, Clone)]
pub struct S3PresignGetParams {
    pub bucket: String,
    pub expiry_secs: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct S3PresignPutParams {
    pub bucket: String,
    pub expiry_secs: Option<u32>,
    pub content_type: Option<String>,
}
