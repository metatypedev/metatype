// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import config from "../config.ts";
import { signJWT, verifyJWT } from "../crypto.ts";
import { UploadUrlMeta } from "../engine/query_engine.ts";
import { QueryEngine } from "../engine/query_engine.ts";

interface TypegraphFile {
  name: string;
  file_hash: string;
  file_size_in_bytes: number;
}

function createUploadPath(origin: string, typegraphName: string) {
  const rand_path = crypto.randomUUID();
  return `${origin}/${typegraphName}/upload-files/files/${rand_path}`;
}

export async function handleUploadUrl(request: Request, engine: QueryEngine) {
  const url = new URL(request.url);
  const origin = url.origin;
  const { name, file_hash, file_size_in_bytes }: TypegraphFile = await request
    .json();
  const uploadUrlMeta: UploadUrlMeta = {
    fileName: name,
    fileHash: file_hash,
    fileSizeInBytes: file_size_in_bytes,
    urlUsed: false,
  };

  let uploadUrl = createUploadPath(origin, engine.name);

  const expiresIn = 5 * 60; // 5 minutes
  const payload = {
    "expiresIn": expiresIn,
  };
  const token = await signJWT(payload, expiresIn);
  uploadUrl = `${uploadUrl}?token=${token}`;

  engine.fileUploadUrlCache.set(uploadUrl, uploadUrlMeta);

  return new Response(JSON.stringify({ uploadUrl: uploadUrl }));
}

export async function handleFileUpload(
  request: Request,
  engine: QueryEngine,
) {
  const url = new URL(request.url);
  if (request.method !== "PUT") {
    throw new Error(
      `${url.pathname} does not support ${request.method} method`,
    );
  }

  const uploadMeta = engine.fileUploadUrlCache.get(url.toString());

  if (!uploadMeta) {
    throw new Error(`Endpoint ${url.toString()} does not exist`);
  }

  const token = url.searchParams.get("token");
  try {
    const _ = await verifyJWT(token!);
  } catch (e) {
    throw new Error("Invalid token: " + e.toString());
  }

  const { fileName, fileHash, fileSizeInBytes, urlUsed }: UploadUrlMeta =
    uploadMeta!;

  if (urlUsed) {
    throw new Error(`Endpoint ${url.toString()} is disabled`);
  }

  const reader = request.body?.getReader()!;

  let fileData = new Uint8Array();
  let bytesRead = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      bytesRead += value.length;
      const temp = new Uint8Array(fileData.length + value.length);
      temp.set(fileData);
      temp.set(value, fileData.length);
      fileData = temp;
    }
  }

  if (bytesRead !== fileSizeInBytes) {
    throw new Error(
      `File size does not match ${bytesRead}, ${JSON.stringify(uploadMeta)}`,
    );
  }

  // adjust relative to the root path
  const fileStorageDir =
    `${config.tmp_dir}/metatype_artifacts/${engine.name}/files`;
  await Deno.mkdir(fileStorageDir, { recursive: true });
  const filePath = `${fileStorageDir}/${fileName}.${fileHash}`;
  await Deno.writeFile(filePath, fileData);

  // mark as the url used once the request completes.
  uploadMeta.urlUsed = true;
  engine.fileUploadUrlCache.set(url.toString(), uploadMeta);

  return new Response(JSON.stringify({
    "success": true,
  }));
}
