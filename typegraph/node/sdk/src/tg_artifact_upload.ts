// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { BasicAuth } from "./tg_deploy.js";
import { Artifact } from "./gen/interfaces/metatype-typegraph-core.js";
import { dirname, join } from "node:path";
import * as fsp from "node:fs/promises";
import { log } from "./io.js";
import { execRequest } from "./utils/func_utils.js";

interface UploadArtifactMeta {
  typegraphName: string;
  relativePath: string;
  sizeInBytes: number;
  hash: string;
}

export class ArtifactUploader {
  constructor(
    private baseUrl: string,
    private refArtifacts: Artifact[],
    private tgName: string,
    private auth: BasicAuth | undefined,
    private headers: Headers,
    private tgPath: string,
  ) {}

  private async getUploadTokens(
    artifactMetas: UploadArtifactMeta[],
  ): Promise<Array<string | null>> {
    const artifactsJson = JSON.stringify(artifactMetas);
    const uploadUrls: Array<string | null> = await execRequest(
      new URL(`${this.tgName}/artifacts/prepare-upload`, this.baseUrl),
      {
        method: "POST",
        headers: this.headers,
        body: artifactsJson,
      },
      `tgDeploy failed to get upload urls`,
    );

    // if (!response.ok) {
    //   log.debug("response", response);
    //   const err = await response.text();
    //   throw new Error(
    //     `Failed requesting artifact upload URLs: ${response.status} - ${err}`,
    //   );
    // }

    // const uploadUrls: Array<string | null> = await response.json();
    if (uploadUrls.length !== artifactMetas.length) {
      const diff =
        `array length mismatch: ${uploadUrls.length} !== ${artifactMetas.length}`;
      throw new Error(`Failed to get upload URLs for all artifacts: ${diff}`);
    }

    return uploadUrls;
  }

  private async upload(
    token: string | null,
    meta: UploadArtifactMeta,
  ): Promise<any> {
    const uploadHeaders = new Headers({
      "Content-Type": "application/octet-stream",
    });

    if (this.auth) {
      uploadHeaders.append("Authorization", this.auth.asHeaderValue());
    }

    if (token == null) {
      log.info("skipping artifact upload:", meta.relativePath);
      return;
    }

    const uploadUrl = new URL(`${this.tgName}/artifacts`, this.baseUrl);
    uploadUrl.searchParams.set("token", token);

    const path = join(dirname(this.tgPath), meta.relativePath);
    // TODO: stream
    const content = await fsp.readFile(path);
    log.debug("uploading artifact", meta.relativePath, uploadUrl.href);
    const res = await execRequest(
      uploadUrl,
      {
        method: "POST",
        headers: uploadHeaders,
        body: new Uint8Array(content),
      } as RequestInit,
      `failed to upload artifact ${meta.relativePath}`,
    );

    log.info("✓ artifact uploaded:", meta.relativePath);
    return res;
  }

  private getMetas(artifacts: Artifact[]): UploadArtifactMeta[] {
    return artifacts.map((artifact) => {
      return {
        typegraphName: this.tgName,
        hash: artifact.hash,
        relativePath: artifact.path,
        sizeInBytes: artifact.size,
      };
    });
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

    const tokens = await this.getUploadTokens(artifactMetas);
    log.debug("upload urls", tokens);
    const results = await Promise.allSettled(
      tokens.map(async (token, i) => {
        return await this.upload(token, artifactMetas[i]);
      }),
    );

    this.handleUploadErrors(results, artifactMetas);
  }
}
