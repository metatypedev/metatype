// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { BasicAuth } from "./tg_deploy.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { runtimes } from "./wit.js";
import { ModuleDependencyMeta } from "./gen/interfaces/metatype-typegraph-runtimes.js";

export interface UploadArtifactMeta {
  name: string;
  artifact_hash: string;
  artifact_size_in_bytes: number;
  path_suffix: string[];
}

export class ArtifactUploader {
  private getUploadUrl: URL;

  constructor(
    private baseUrl: string,
    private refArtifacts: [string, string][],
    private tgName: string,
    private auth: BasicAuth | undefined,
    private headers: Headers,
  ) {
    const suffix = `${tgName}/get-upload-url`;
    this.getUploadUrl = new URL(suffix, baseUrl);
  }

  private async fetchUploadUrl(
    artifactPath: string,
    artifactHash: string,
    artifactContent: Uint8Array,
    pathSuffix: string[],
  ): Promise<string> {
    const artifactMeta: UploadArtifactMeta = {
      name: path.basename(artifactPath),
      artifact_hash: artifactHash,
      artifact_size_in_bytes: artifactContent.length,
      path_suffix: pathSuffix,
    };

    const artifactJson = JSON.stringify(artifactMeta);
    const uploadUrlResponse = await fetch(this.getUploadUrl, {
      method: "PUT",
      headers: this.headers,
      body: artifactJson,
    });

    // console.log("******************A", uploadUrlResponse);
    const decodedResponse = await uploadUrlResponse.json();

    return decodedResponse.uploadUrl as string;
  }

  private async upload(
    url: string,
    content: Uint8Array,
    artifactPath: string,
  ): Promise<void> {
    const uploadHeaders = new Headers({
      "Content-Type": "application/octet-stream",
    });

    if (this.auth) {
      uploadHeaders.append("Authorization", this.auth.asHeaderValue());
    }

    const artifactUploadResponse = await fetch(url, {
      method: "PUT",
      headers: uploadHeaders,
      body: content,
    });

    const _ = await artifactUploadResponse.json();
    if (!artifactUploadResponse.ok) {
      throw new Error(
        `Failed to upload artifact ${artifactPath} to typegate: ${artifactUploadResponse.status} ${artifactUploadResponse.statusText}`,
      );
    }
  }

  async uploadArtifacts(): Promise<void> {
    for (let [artifactHash, artifactPath] of this.refArtifacts) {
      await this.uploadArtifact(artifactHash, artifactPath);
    }
  }

  private async uploadArtifact(
    artifactHash: string,
    artifactPath: string,
  ): Promise<void> {
    try {
      await fs.promises.access(artifactPath);
    } catch (err) {
      throw new Error(`Failed to access artifact ${artifactPath}: ${err}`);
    }
    let artifactContent: Buffer;
    try {
      artifactContent = await fs.promises.readFile(artifactPath);
    } catch (err) {
      throw new Error(`Failed to read artifact ${artifactPath}: ${err}`);
    }
    const byteArray = new Uint8Array(artifactContent);

    const artifactUploadUrl = await this.fetchUploadUrl(
      artifactPath,
      artifactHash,
      byteArray,
      [],
    );

    await this.upload(artifactUploadUrl, byteArray, artifactPath);

    await this.uploadArtifactDependencies(artifactHash);
  }

  private async uploadArtifactDependencies(
    artifactHash: string,
  ): Promise<void> {
    const depMetas = runtimes.getDeps(artifactHash);

    for (let dep of depMetas) {
      const { depHash, path: depPath, relativePathPrefix }:
        ModuleDependencyMeta = dep;

      try {
        await fs.promises.access(depPath);
      } catch (err) {
        throw new Error(`Failed to access artifact ${path}: ${err}`);
      }
      let depContent: Buffer;
      try {
        depContent = await fs.promises.readFile(depPath);
      } catch (err) {
        throw new Error(`Failed to read artifact ${path}: ${err}`);
      }
      const byteArray = new Uint8Array(depContent);

      const depUploadUrl = await this.fetchUploadUrl(
        depPath,
        depHash,
        byteArray,
        relativePathPrefix,
      );

      await this.upload(depUploadUrl, byteArray, depPath);
    }
  }
}
