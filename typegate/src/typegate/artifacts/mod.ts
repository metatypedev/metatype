// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { signJWT, verifyJWT } from "../../crypto.ts";
import * as jwt from "jwt";
import { z } from "zod";
import config from "../../config.ts";
import { dirname } from "std/path/dirname.ts";
import { resolve } from "std/path/resolve.ts";

// The directory where artifacts are stored -- by hash
export const STORE_DIR = `${config.tmp_dir}/artifacts-cache`;
export const STORE_TEMP_DIR = `${config.tmp_dir}/artifacts-cache/tmp`;
const ARTIFACTS_DIR = `${config.tmp_dir}/artifacts`;

function getUploadPath(tgName: string) {
  return `/${tgName}/artifacts`;
}

export async function getLocalPath(meta: ArtifactMeta) {
  const cachedPath = resolve(STORE_DIR, meta.hash);
  const localPath = resolve(
    ARTIFACTS_DIR,
    meta.typegraphName,
    meta.relativePath,
  );

  // TODO: what happens when symlink already exists? or when same local path artifacts with different cachedPath
  try {
    await Deno.lstat(localPath);
    return localPath;
  } catch {
    await Deno.mkdir(dirname(localPath), { recursive: true });
    await Deno.link(cachedPath, localPath);

    return localPath;
  }
}

export const artifactMetaSchema = z.object({
  typegraphName: z.string(),
  relativePath: z.string(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  sizeInBytes: z.number(),
});

export type ArtifactMeta = z.infer<typeof artifactMetaSchema>;

export abstract class ArtifactStore {
  /**
   * Persist an artifact to the store.
   * @param stream The artifact content.
   * @returns The hash of the artifact.
   */
  abstract persist(stream: ReadableStream): Promise<string>;

  /**
   * Delete an artifact from the store.
   * @param hash The hash of the artifact.
   * @throws If the artifact does not exist.
   */
  abstract delete(hash: string): Promise<void>;

  /**
   * Check if the artifact is available in the store.
   * @param hash The hash of the artifact.
   * @returns Whether the artifact is available.
   */
  abstract has(hash: string): Promise<boolean>;

  /**
   * Ensure that the artifact is available locally (in the file system).
   * @param meta The artifact metadata.
   * @param deps The dependencies of the artifact.
   * @returns The local path to the artifact.
   * @throws If the artifact is not available (not persisted on the store).
   */
  abstract getLocalPath(
    meta: ArtifactMeta,
    deps?: ArtifactMeta[],
  ): Promise<string>;

  /**
   * Create a new upload URL for the given artifact.
   * @param meta The artifact metadata.
   * @param origin The origin of the request.
   * @returns The URL to upload the artifact to, or null if the artifact is already uploaded.
   */
  abstract prepareUpload(
    meta: ArtifactMeta,
    origin: URL,
  ): Promise<string | null>;

  /**
   * Remove the given upload URL from the store.
   * @param url The URL to remove.
   * @returns The artifact metadata.
   * @throws If the URL is invalid or expired.
   */
  abstract takeUploadUrl(url: URL): Promise<ArtifactMeta>;

  abstract close(): Promise<void>;

  /** unique identifier for an artifact (file content) */
  static getArtifactKey(meta: ArtifactMeta) {
    // TODO what happens on cache collision?
    return meta.hash;
  }

  /**
   * Get the URL to upload an artifact to.
   * @param origin The origin of the request.
   * @returns The URL to upload the artifact to and the expiration time.
   */
  static async createUploadUrl(
    origin: URL,
    tgName: string,
  ): Promise<[string, number]> {
    const expiresIn = 5 * 60;
    const token = await signJWT({ expiresIn }, expiresIn);
    const url = new URL(getUploadPath(tgName), origin);
    url.searchParams.set("token", token);
    return [url.toString(), jwt.getNumericDate(expiresIn)];
  }

  static async validateUploadUrl(url: URL) {
    const token = url.searchParams.get("token");
    if (/^\/([^\/])\/artifacts/.test(url.pathname) || !token) {
      throw new Error("Invalid upload URL");
    }

    const context = await verifyJWT(token);
    if (context.exp as number < jwt.getNumericDate(new Date())) {
      throw new Error("Expired upload URL");
    }
  }
}
