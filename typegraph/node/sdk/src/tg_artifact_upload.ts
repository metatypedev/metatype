// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { BasicAuth } from "./tg_deploy.js";
import { Artifact } from "./gen/interfaces/metatype-typegraph-core.js";
import { dirname, join } from "node:path";
import * as fsp from "node:fs/promises";

interface UploadArtifactMeta {
  typegraphName: string;
  relativePath: string;
  sizeInBytes: number;
  hash: string;
}

export class ArtifactUploader {
  private getUploadUrl: URL;

  constructor(
    baseUrl: string,
    private refArtifacts: Artifact[],
    private tgName: string,
    private auth: BasicAuth | undefined,
    private headers: Headers,
    private tgPath: string,
  ) {
    const suffix = `${tgName}/artifacts/upload-urls`;
    this.getUploadUrl = new URL(suffix, baseUrl);
  }

  private async fetchUploadUrls(
    artifactMetas: UploadArtifactMeta[],
  ): Promise<Array<string | null>> {
    const artifactsJson = JSON.stringify(artifactMetas);
    const response = await fetch(this.getUploadUrl, {
      method: "POST",
      headers: this.headers,
      body: artifactsJson,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(
        `Failed requesting artifact upload URLs: ${response.status} - ${err}`,
      );
    }

    const uploadUrls: Array<string | null> = await response.json();
    if (uploadUrls.length !== artifactMetas.length) {
      const diff =
        `array length mismatch: ${uploadUrls.length} !== ${artifactMetas.length}`;
      throw new Error(`Failed to get upload URLs for all artifacts: ${diff}`);
    }

    return uploadUrls;
  }

  private async upload(
    url: string | null,
    meta: UploadArtifactMeta,
  ): Promise<any> {
    const uploadHeaders = new Headers({
      "Content-Type": "application/octet-stream",
    });

    if (this.auth) {
      uploadHeaders.append("Authorization", this.auth.asHeaderValue());
    }

    if (url == null) {
      // console.error(`Skipping upload for artifact: ${meta.relativePath}`);
      return;
    }

    const path = join(dirname(this.tgPath), meta.relativePath);
    // TODO: stream
    const content = await fsp.readFile(path);
    const res = await fetch(url, {
      method: "POST",
      headers: uploadHeaders,
      body: new Uint8Array(content),
    } as RequestInit);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(
        `Failed to upload artifact '${path}' (${res.status}): ${err}`,
      );
    }
    return res.json();
  }

  private getMetas(artifacts: Artifact[]): UploadArtifactMeta[] {
    return artifacts.map(
      (artifact) => {
        return {
          typegraphName: this.tgName,
          hash: artifact.hash,
          relativePath: artifact.path,
          sizeInBytes: artifact.size,
        };
      },
    );
  }

  private handleUploadErrors(
    results: PromiseSettledResult<any>[],
    artifactMetas: UploadArtifactMeta[],
  ) {
    let errors = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const meta = artifactMetas[i];
      if (result.status === "rejected") {
        console.error(
          `Failed to upload artifact '${meta.relativePath}': ${result.reason}`,
        );
        errors++;
      } else {
        // console.error(`Successfully uploaded artifact '${meta.relativePath}'`);
      }
    }

    if (errors > 0) {
      throw new Error(`Failed to upload ${errors} artifacts`);
    }
  }

  async uploadArtifacts(): Promise<void> {
    const artifactMetas = this.getMetas(this.refArtifacts);

    const uploadUrls = await this.fetchUploadUrls(artifactMetas);
    const results = await Promise.allSettled(
      uploadUrls.map(
        async (url, i) => {
          return await this.upload(url, artifactMetas[i]);
        },
      ),
    );

    this.handleUploadErrors(results, artifactMetas);
  }
}
