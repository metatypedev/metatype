// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { ArtifactResolutionConfig } from "./gen/interfaces/metatype-typegraph-core.js";
import { ArtifactUploader } from "./tg_artifact_upload.js";
import { TypegraphOutput } from "./typegraph.js";
import { wit_utils } from "./wit.js";
import { execRequest } from "./utils/func_utils.js";

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
  response: Record<string, any>;
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
  }, `tgDeploy failed to deploy typegraph ${typegraph.name}`);

  if (response.errors) {
    for (const err of response.errors) {
      console.error(err.message);
    }
    throw new Error(`failed to deploy typegraph ${typegraph.name}`);
  }

  return {
    serialized: tgJson,
    response: response.data.addTypegraph,
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
  }, `tgRemove failed to remove typegraph ${typegraph.name}`);

  return { typegate: response };
}
