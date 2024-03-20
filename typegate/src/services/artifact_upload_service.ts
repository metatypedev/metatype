// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "../config.ts";
import { signJWT, verifyJWT } from "../crypto.ts";
import { UploadUrlMeta } from "../typegate/mod.ts";

interface TypegraphArtifact {
  name: string;
  artifact_hash: string;
  artifact_size_in_bytes: number;
}

function createUploadPath(origin: string, typegraphName: string) {
  const rand_path = crypto.randomUUID();
  return `${origin}/${typegraphName}/upload-artifacts/artifacts/${rand_path}`;
}

export async function handleUploadUrl(
  request: Request,
  tgName: string,
  urlCache: Map<string, UploadUrlMeta>,
) {
  const url = new URL(request.url);
  const origin = url.origin;
  const { name, artifact_hash, artifact_size_in_bytes }: TypegraphArtifact =
    await request
      .json();
  const uploadUrlMeta: UploadUrlMeta = {
    artifactName: name,
    artifactHash: artifact_hash,
    artifactSizeInBytes: artifact_size_in_bytes,
    urlUsed: false,
  };

  let uploadUrl = createUploadPath(origin, tgName);

  const expiresIn = 5 * 60; // 5 minutes
  const payload = {
    "expiresIn": expiresIn,
  };
  const token = await signJWT(payload, expiresIn);
  uploadUrl = `${uploadUrl}?token=${token}`;

  urlCache.set(uploadUrl, uploadUrlMeta);

  return new Response(JSON.stringify({ uploadUrl: uploadUrl }));
}

export async function handleArtifactUpload(
  request: Request,
  tgName: string,
  urlCache: Map<string, UploadUrlMeta>,
) {
  const url = new URL(request.url);
  if (request.method !== "PUT") {
    throw new Error(
      `${url.pathname} does not support ${request.method} method`,
    );
  }

  const uploadMeta = urlCache.get(url.toString());

  if (!uploadMeta) {
    throw new Error(`Endpoint ${url.toString()} does not exist`);
  }

  const token = url.searchParams.get("token");
  try {
    const _ = await verifyJWT(token!);
  } catch (e) {
    throw new Error("Invalid token: " + e.toString());
  }

  const { artifactName, artifactHash, artifactSizeInBytes, urlUsed }:
    UploadUrlMeta = uploadMeta!;

  if (urlUsed) {
    throw new Error(`Endpoint ${url.toString()} is disabled`);
  }

  const reader = request.body?.getReader()!;

  let artifactData = new Uint8Array();
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      bytesRead += value.length;
      const temp = new Uint8Array(artifactData.length + value.length);
      temp.set(artifactData);
      temp.set(value, artifactData.length);
      artifactData = temp;
    }
  }

  if (bytesRead !== artifactSizeInBytes) {
    throw new Error(
      `File size does not match ${bytesRead}, ${JSON.stringify(uploadMeta)}`,
    );
  }

  // adjust relative to the root path
  const artifactStorageDir =
    `${config.tmp_dir}/metatype_artifacts/${tgName}/artifacts`;
  await Deno.mkdir(artifactStorageDir, { recursive: true });
  const artifactPath = `${artifactStorageDir}/${artifactName}.${artifactHash}`;
  await Deno.writeFile(artifactPath, artifactData);

  // mark as the url used once the request completes.
  uploadMeta.urlUsed = true;
  urlCache.set(url.toString(), uploadMeta);

  return new Response(JSON.stringify({
    "success": true,
  }));
}
