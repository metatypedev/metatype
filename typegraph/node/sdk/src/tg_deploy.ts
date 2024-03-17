// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import * as process from "process";
import * as fs from "fs";
import * as path from "path";

export class BasicAuth {
  constructor(public username: string, public password: string) {
  }
  asHeaderValue(): string {
    return `Basic ${btoa(this.username + ":" + this.password)}`;
  }
}

export interface TypegraphDeployParams {
  baseUrl: string;
  auth?: BasicAuth;
  artifactsConfig: ArtifactResolutionConfig;
  secrets: Record<string, string>;
}

export interface TypegraphRemoveParams {
  baseUrl: string;
  auth?: BasicAuth;
}

export interface DeployResult {
  serialized: string;
  typegate: Record<string, any> | string;
}

export interface RemoveResult {
  typegate: Record<string, any> | string;
}

export interface UploadArtifactMeta {
  name: string;
  file_hash: string;
  file_size_in_bytes: number;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
): Promise<DeployResult> {
  const { baseUrl, secrets, auth, artifactsConfig } = params;
  const serialized = typegraph.serialize(artifactsConfig);
  const tgJson = serialized.tgJson;
  const ref_files = serialized.ref_files;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlDeployQuery({
      tg: tgJson,
      secrets: Object.entries(secrets ?? {}),
    }),
  });

  const result = {
    serialized: tgJson,
    typegate: await handleResponse(response),
  };

  const getUploadUrl = new URL("/get-upload-url", baseUrl);
  for (let [fileHash, filePath] of ref_files) {
    const prefix = "file:";

    if (!filePath.startsWith(prefix)) {
      throw new Error(`file path ${filePath} should start with ${prefix}`);
    }

    const currDir = process.cwd();
    filePath = filePath.slice(prefix.length);
    filePath = `${currDir}/${filePath}`;
    const fileContent: Buffer = fs.readFileSync(filePath);
    const byteArray = new Uint8Array(fileContent);

    const artifactMeta: UploadArtifactMeta = {
      name: path.basename(filePath),
      file_hash: fileHash,
      file_size_in_bytes: fileContent.length,
    };

    const artifactJson = JSON.stringify(artifactMeta);
    const uploadUrlResponse = await fetch(getUploadUrl, {
      method: "PUT",
      headers,
      body: artifactJson,
    });
    const decodedResponse = await handleResponse(uploadUrlResponse) as Record<
      string,
      any
    >;
    const uploadUrl = decodedResponse.uploadUrl;

    const uploadHeaders = new Headers({
      "Content-Type": "application/octet-stream",
    });

    if (auth) {
      uploadHeaders.append("Authorization", auth.asHeaderValue());
    }

    const artifactUploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: uploadHeaders,
      body: byteArray,
    });

    if (!artifactUploadResponse.ok) {
      throw new Error(
        `Failed to upload artifact ${filePath} to typegate: ${artifactUploadResponse.status} ${artifactUploadResponse.statusText}`,
      );
    }
  }

  return result;
}

export async function tgRemove(
  typegraph: TypegraphOutput,
  params: TypegraphRemoveParams,
): Promise<RemoveResult> {
  const { baseUrl, auth } = params;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlRemoveQuery([typegraph.name]),
  });
  return {
    typegate: await handleResponse(response),
  };
}

async function handleResponse(
  response: Response,
): Promise<Record<string, any> | string> {
  if (response.headers.get("Content-Type") == "application/json") {
    return await response.json();
  }
  return await response.text();
}
