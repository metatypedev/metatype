// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

use future::join_all;
use reqwest::{header::HeaderMap, Client, Url};
use tokio::fs;
use typegraph_core::sdk::core::Artifact;

use crate::interlude::*;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UploadArtifactMeta {
    typegraph_name: String,
    relative_path: String,
    size_in_bytes: u32,
    hash: String,
}

#[derive(Debug, Deserialize)]
struct UploadResponse {
    status: String,
    reason: Option<String>,
}

#[derive(Debug)]
pub struct ArtifactUploader<'a> {
    pub client: &'a Client,
    pub base_url: Url,
    pub base_header: HeaderMap,
    pub typegraph_name: String,
    pub typegraph_path: String,
}

impl<'a> ArtifactUploader<'a> {
    pub async fn upload_artifacts(self, artifacts: &[Artifact]) -> Result<()> {
        let artifact_metas = self.get_artifact_metas(artifacts);
        let upload_tokens = self.get_upload_tokens(&artifact_metas).await?;

        log::debug!(
            "upload URLs {}",
            serde_json::to_string(&upload_tokens).unwrap()
        );

        let results = upload_tokens
            .into_iter()
            .zip(artifact_metas.iter())
            .map(|(token, meta)| self.upload(token, meta));
        let results = join_all(results).await;
        let mut errors = 0;

        for (result, meta) in results.into_iter().zip(artifact_metas) {
            let error = match result {
                Err(error) => Some(error.to_string()),
                Ok(Some(value)) if value.status == "rejected" => {
                    Some(value.reason.unwrap_or("Upload failed".to_string()))
                }
                _ => None,
            };

            if let Some(error) = error {
                log::error!(
                    "Failed to upload artifact '{}': {}",
                    meta.relative_path,
                    error
                );
                errors += 1;
            }
        }

        if errors > 0 {
            bail!("Failed to upload {errors} artifacts");
        }

        Ok(())
    }

    async fn upload(
        &self,
        token: Option<String>,
        meta: &UploadArtifactMeta,
    ) -> Result<Option<UploadResponse>> {
        if let Some(token) = token {
            let file_path = Path::new(&self.typegraph_path)
                .parent()
                .with_context(|| "Failed to get typegraph parent directory")?
                .join(&meta.relative_path);
            let bytes = fs::read(file_path).await?;
            let endpoint = format!("/{}/artifacts", self.typegraph_name);
            let mut url = self.base_url.join(&endpoint).unwrap();

            url.query_pairs_mut().append_pair("token", &token);

            log::debug!("uploading artifact: {} {}", meta.relative_path, url);

            let response = self.client.post(url).body(bytes).send().await?;

            log::info!("✓ artifact uploaded: {}", meta.relative_path);

            Ok(response.json().await?)
        } else {
            log::info!("skipping artifact upload: {}", meta.relative_path);

            Ok(None)
        }
    }

    async fn get_upload_tokens(
        &self,
        arifact_metas: &[UploadArtifactMeta],
    ) -> Result<Vec<Option<String>>> {
        let endpoint = format!("{}/artifacts/prepare-upload", self.typegraph_name);
        let url = self.base_url.join(&endpoint).unwrap();
        let response = self
            .client
            .post(url)
            .headers(self.base_header.clone())
            .json(arifact_metas)
            .send()
            .await?;
        let uploaded_urls: Vec<Option<String>> = response.json().await?;

        if uploaded_urls.len() != arifact_metas.len() {
            let diff = format!(
                "array length mismatch: {} !== {}",
                uploaded_urls.len(),
                arifact_metas.len()
            );
            bail!("Failed to get upload URLs for all artifacts: {diff}");
        }

        Ok(uploaded_urls)
    }

    fn get_artifact_metas(&self, artifacts: &[Artifact]) -> Vec<UploadArtifactMeta> {
        artifacts
            .iter()
            .map(|artifact| UploadArtifactMeta {
                typegraph_name: self.typegraph_name.clone(),
                relative_path: artifact.path.clone(),
                size_in_bytes: artifact.size,
                hash: artifact.hash.clone(),
            })
            .collect()
    }
}
