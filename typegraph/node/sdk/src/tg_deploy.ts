// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { ArtifactUploader } from "./tg_artifact_upload.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import * as fsp from "node:fs/promises";
import { dirname, join } from "node:path";

export class BasicAuth {
  constructor(public username: string, public password: string) {
  }
  asHeaderValue(): string {
    return `Basic ${btoa(this.username + ":" + this.password)}`;
  }
}

export interface TypegraphDeployParams {
  typegraphPath: string;
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

export interface ArtifactMeta {
  typegraphName: string;
  relativePath: string;
  hash: string;
  sizeInBytes: number;
}

export async function tgDeploy(
  typegraph: TypegraphOutput,
  params: TypegraphDeployParams,
): Promise<DeployResult> {
  const { baseUrl, secrets, auth, artifactsConfig } = params;
  const serialized = typegraph.serialize(artifactsConfig);
  const tgJson = serialized.tgJson;
  const refArtifacts = serialized.ref_artifacts;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (auth) {
    headers.append("Authorization", auth.asHeaderValue());
  }

  if (refArtifacts.length > 0) {
    // upload the artifacts
    const artifactUploader = new ArtifactUploader(
      baseUrl,
      refArtifacts,
      typegraph.name,
      auth,
      headers,
      params.typegraphPath,
    );
    await artifactUploader.uploadArtifacts();
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
    throw Error(`expected json object, got "${await response.text()}"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : err;
    throw Error(`error executing request to ${url.toString()}: ${message}`);
  }
}
