// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import * as fs from "node:fs";
import * as path from "node:path";

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
  artifact_hash: string;
  artifact_size_in_bytes: number;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
): Promise<DeployResult> {
  const { baseUrl, secrets, auth, artifactsConfig } = params;
  const serialized = typegraph.serialize(artifactsConfig);
  const tgJson = serialized.tgJson;
  const ref_artifacts = serialized.ref_artifacts;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  // upload the artifacts
  const suffix = `${typegraph.name}/get-upload-url`;
  const getUploadUrl = new URL(suffix, baseUrl);
  for (let [artifactHash, artifactPath] of ref_artifacts) {
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

    const artifactMeta: UploadArtifactMeta = {
      name: path.basename(artifactPath),
      artifact_hash: artifactHash,
      artifact_size_in_bytes: artifactContent.length,
    };

    const artifactJson = JSON.stringify(artifactMeta);
    const uploadUrlResponse = await fetch(getUploadUrl, {
      method: "PUT",
      headers,
      body: artifactJson,
    });
    const decodedResponse = await uploadUrlResponse.json();

    const uploadUrl = decodedResponse.uploadUrl as string;

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

    const _ = await artifactUploadResponse.json();
    if (!artifactUploadResponse.ok) {
      throw new Error(
        `Failed to upload artifact ${artifactPath} to typegate: ${artifactUploadResponse.status} ${artifactUploadResponse.statusText}`,
      );
    }
  }

  // deploy the typegraph
  const response = await execRequest(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlDeployQuery({
      tg: tgJson,
      secrets: Object.entries(secrets ?? {}),
    }),
  });

  return {
    serialized: tgJson,
    typegate: response,
  };
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

  const response = await execRequest(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlRemoveQuery([typegraph.name]),
  });

  return { typegate: response };
}

/**
 * Simple fetch wrapper with more verbose errors
 */
async function execRequest(url: URL, reqInit: RequestInit) {
  try {
    const response = await fetch(url, reqInit);
    if (response.headers.get("Content-Type") == "application/json") {
      return await response.json();
    }
    throw Error(`Expected json object, got "${await response.text()}"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : err;
    throw Error(`${message}: ${url.toString()}`);
  }
}
