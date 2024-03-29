// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { BasicAuth } from "./tg_deploy.js";
import { core } from "./wit.js";
import { Artifact } from "./gen/interfaces/metatype-typegraph-core.js";
import * as fsp from "node:fs/promises";

export interface UploadArtifactMeta {
  typegraphName: string;
  hash: string;
  sizeInBytes: number;
  relativePath: string;
}

export class ArtifactUploader {
  private getUploadUrl: URL;
  refArtifacts: UploadArtifactMeta[];

  constructor(
    private baseUrl: string,
    refArtifacts: Artifact[],
    private tgName: string,
    private auth: BasicAuth | undefined,
    private headers: Headers,
  ) {
    const suffix = `${tgName}/artifacts/upload-urls`;
    this.getUploadUrl = new URL(suffix, baseUrl);
    this.refArtifacts = refArtifacts.map(({ path, hash, size }) => {
      return {
        typegraphName: tgName,
        relativePath: path,
        hash: hash,
        sizeInBytes: size,
      };
    });
  }

  private async fetchUploadUrls(
    artifactMetas: UploadArtifactMeta[],
  ): Promise<(string | null)[]> {
    const artifactsJson = JSON.stringify(artifactMetas);
    const uploadUrlResponse = await fetch(this.getUploadUrl, {
      method: "POST",
      headers: this.headers,
      body: artifactsJson,
    });

    if (!uploadUrlResponse.ok) {
      const err = await uploadUrlResponse.text();
      throw new Error(`Failed to get upload URLs for all artifacts: ${err}`);
    }

    const uploadUrls: Array<string | null> = await uploadUrlResponse.json();
    if (uploadUrls.length !== artifactMetas.length) {
      const diff =
        `array length mismatch: ${uploadUrls.length} !== ${artifactMetas.length}`;
      throw new Error(`Failed to get upload URLs for all artifacts: ${diff}`);
    }
    return uploadUrls;
  }

  private async upload(
    url: string,
    artifactPath: string,
  ): Promise<void> {
    const uploadHeaders = new Headers({
      // TODO match to file extennsion??
      "Content-Type": "application/octet-stream",
    });

    if (this.auth) {
      uploadHeaders.append("Authorization", this.auth.asHeaderValue());
    }

    const file = await fsp.open(artifactPath, "r");
    const res = await fetch(url, {
      method: "POST",
      headers: uploadHeaders,
      body: file.readableWebStream(),
    } as RequestInit);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(
        `Failed to upload artifact '${artifactPath}' (${res.status}): ${err}`,
      );
    }
    return res.json();
  }

  async uploadArtifacts(): Promise<void> {
    this._uploadArtifacts(this.refArtifacts);

    for (const artifact of this.refArtifacts) {
      await this.uploadArtifactDependencies(artifact.hash);
    }
  }

  private async _uploadArtifacts(
    artifactMetas: UploadArtifactMeta[],
  ): Promise<void> {
    const uploadUrls = await this.fetchUploadUrls(this.refArtifacts);

    const results = await Promise.allSettled(uploadUrls.map(async (url, i) => {
      if (url == null) {
        console.log(
          `Skipping upload for artifact: ${this.refArtifacts[i].relativePath}`,
        );
        return;
      }
      const meta = this.refArtifacts[i];

      return this.upload(url, meta.relativePath);
    }));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const meta = this.refArtifacts[i];
      if (result.status === "rejected") {
        console.error(
          `Failed to upload artifact '${meta.relativePath}': ${result.reason}`,
        );
      } else {
        console.log(`Successfully uploaded artifact '${meta.relativePath}'`);
      }
    }
  }

  private async uploadArtifactDependencies(
    artifactHash: string,
  ): Promise<void> {
    const deps = core.getDeps(artifactHash);

    const depMetas = deps.map(({ hash, size, path }) => {
      return {
        typegraphName: this.tgName,
        relativePath: path,
        hash: hash,
        sizeInBytes: size,
      };
    });

    this._uploadArtifacts(depMetas);
  }
}
