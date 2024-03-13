// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

function createUploadPath(origin: string, typegraphName: string) {
  const rand_path = crypto.randomUUID();
  return `${origin}/${typegraphName}/files/${rand_path}`;
}

export function handleUploadUrl(request: Request, typegraphName: string) {
  const url = new URL(request.url);
  const origin = url.origin;

  const uploadUrl = createUploadPath(origin, typegraphName);
  return new Response(uploadUrl);
}

interface TypegraphFile {
  name: string;
  fileHash: string;
  fileSizeInBytes: number;
  file: string;
}

export async function handleFileUpload(
  request: Request,
  typegraphName: string,
) {
  const url = new URL(request.url);
  if (request.method !== "POST") {
    throw new Error(
      `${url.pathname} does not support ${request.method} method`,
    );
  }

  const fileStorageDir = `metatype_artifacts/${typegraphName}/files`;
  const { name, fileHash, fileSizeInBytes, file }: TypegraphFile = await request
    .json();

  const fileData = Uint8Array.from(atob(file), (c) => c.charCodeAt(0));

  if (fileData.length !== fileSizeInBytes) {
    throw new Error();
  }

  await Deno.mkdir(fileStorageDir, { recursive: true });
  const filePath = `${fileStorageDir}/${name}.${fileHash}`;
  await Deno.writeFile(filePath, fileData);

  return new Response();
}
