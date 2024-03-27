// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { ArtifactUploader } from "./tg_artifact_upload.js";
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
  pathSuffix: string[];
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

  // console.log("****************T", tgJson);

  // upload the artifacts
  const artifactUploader = new ArtifactUploader(
    baseUrl,
    ref_artifacts,
    typegraph.name,
    auth,
    headers,
  );
  await artifactUploader.uploadArtifacts();

  // deploy the typegraph
  const response = await fetch(new URL("/typegate", baseUrl), {
    method: "POST",
    headers,
    body: wit_utils.gqlDeployQuery({
      tg: tgJson,
      secrets: Object.entries(secrets ?? {}),
    }),
  });

  return {
    serialized: tgJson,
    typegate: await handleResponse(response),
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
