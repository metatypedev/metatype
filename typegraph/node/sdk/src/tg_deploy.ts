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

  // upload the artifacts
  const suffix = `${typegraph.name}/artifacts/upload-urls`;
  const createUploadUrlEndpoint = new URL(suffix, baseUrl);

  const artifacts = refArtifacts.map(({ path, hash, size }) => {
    return {
      typegraphName: typegraph.name,
      relativePath: path,
      hash: hash,
      sizeInBytes: size,
    };
  });

  const res = await fetch(createUploadUrlEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(artifacts),
  } as RequestInit);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get upload URLs for all artifacts: ${err}`);
  }

  const uploadUrls: Array<string | null> = await res.json();
  if (uploadUrls.length !== artifacts.length) {
    const diff =
      `array length mismatch: ${uploadUrls.length} !== ${artifacts.length}`;
    throw new Error(`Failed to get upload URLs for all artifacts: ${diff}`);
  }

  const uploadHeaders = new Headers({
    // TODO match to file extension??
    "Content-Type": "application/octet-stream",
  });

  if (auth) {
    uploadHeaders.append("Authorization", auth.asHeaderValue());
  }

  const results = await Promise.allSettled(uploadUrls.map(async (url, i) => {
    if (url == null) {
      console.log(`Skipping upload for artifact: ${artifacts[i].relativePath}`);
      return;
    }
    const meta = artifacts[i];

    const path = join(dirname(params.typegraphPath), meta.relativePath);
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
  }));

  let errors = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const meta = artifacts[i];
    if (result.status === "rejected") {
      console.error(
        `Failed to upload artifact '${meta.relativePath}': ${result.reason}`,
      );
      errors++;
    } else {
      console.log(`Successfully uploaded artifact '${meta.relativePath}'`);
    }
  }

  if (errors > 0) {
    throw new Error(`Failed to upload ${errors} artifacts`);
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
