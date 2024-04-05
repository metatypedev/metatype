// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { createHash } from "node:crypto";
import { S3, S3ClientConfig } from "aws-sdk/client-s3";
import {
  deinitUploadUrlStore,
  getLocalPath,
  initUploadUrlStore,
  STORE_DIR,
  STORE_TEMP_DIR,
  UploadUrlStore,
} from "./local.ts";
import { ArtifactStore } from "./mod.ts";
import { HashTransformStream } from "../../utils/hash.ts";
import { resolve } from "std/path/resolve.ts";

export class SharedArtifactStore extends ArtifactStore {
  #uploadUrls: UploadUrlStore;
  #s3!: S3;
  #s3Bucket: string;

  static init(s3Config: S3ClientConfig, s3Bucket: string) {
    return new SharedArtifactStore(s3Config, s3Bucket);
  }

  constructor(s3Config: S3ClientConfig, s3Bucket: string) {
    super();
    this.#s3 = new S3(s3Config);
    this.#s3Bucket = s3Bucket;
    this.#uploadUrls = initUploadUrlStore();
  }

  override async persist(stream: ReadableStream<any>): Promise<string> {
    const tmpFile = await Deno.makeTempFile({
      dir: STORE_TEMP_DIR,
    });
    const file = await Deno.open(tmpFile, { write: true, truncate: true });
    const hasher = createHash("sha256");
    await stream
      .pipeThrough(new HashTransformStream(hasher))
      .pipeTo(file.writable);

    const hash = hasher.digest("hex");
    await this.#s3.putObject({
      Bucket: this.#s3Bucket,
      Key: hash,
      Body: stream,
    });

    return hash;
  }

  override async delete(hash: string): Promise<void> {
    await this.#s3.deleteObject({
      Bucket: this.#s3Bucket,
      Key: hash,
    });
  }

  override async has(hash: string): Promise<boolean> {
    try {
      await this.#s3.headObject({
        Bucket: this.#s3Bucket,
        Key: hash,
      });
      return true;
    } catch (error) {
      if (error.name === "NoSuchKey") {
        return false;
      }
      throw error;
    }
  }

  override async getLocalPath(
    meta: {
      typegraphName: string;
      relativePath: string;
      hash: string;
      sizeInBytes: number;
    },
    deps?: {
      typegraphName: string;
      relativePath: string;
      hash: string;
      sizeInBytes: number;
    }[] | undefined,
  ): Promise<string> {
    for (const dep of deps ?? []) {
      await this.#downloadFromRemote(dep.hash, dep.relativePath);
      await getLocalPath(dep);
    }

    await this.#downloadFromRemote(meta.hash, meta.relativePath);
    return await getLocalPath(meta);
  }

  async #downloadFromRemote(hash: string, relativePath: string) {
    const targetFile = resolve(STORE_DIR, hash);
    const response = await this.#s3.getObject({
      Bucket: this.#s3Bucket,
      Key: hash,
    });

    if (response.$metadata.httpStatusCode === 404) {
      throw new Error(
        `Artifact ${relativePath} with hash ${relativePath} not found`,
      );
    }

    if (response.Body) {
      const content = await response.Body.transformToByteArray();
      await Deno.writeFile(targetFile, content);
    } else {
      throw new Error(`Failed to download artifact ${relativePath} from s3`);
    }
  }

  override async prepareUpload(
    meta: {
      typegraphName: string;
      relativePath: string;
      hash: string;
      sizeInBytes: number;
    },
    origin: URL,
  ): Promise<string | null> {
    // should not be uploaded again
    if (await this.has(ArtifactStore.getArtifactKey(meta))) {
      return null;
    }

    const [url, expirationTime] = await ArtifactStore.createUploadUrl(
      origin,
      meta.typegraphName,
    );
    this.#uploadUrls.mapToMeta.set(url, meta);
    this.#uploadUrls.expirationQueue.push([url, expirationTime]);

    return url;
  }

  override takeUploadUrl(
    url: URL,
  ): Promise<
    {
      typegraphName: string;
      relativePath: string;
      hash: string;
      sizeInBytes: number;
    }
  > {
    ArtifactStore.validateUploadUrl(url);

    const meta = this.#uploadUrls.mapToMeta.get(url.toString());
    if (!meta) {
      throw new Error("Invalid upload URL");
    }

    this.#uploadUrls.mapToMeta.delete(url.toString());
    return Promise.resolve(meta);
  }

  override close(): Promise<void> {
    deinitUploadUrlStore(this.#uploadUrls);
    return Promise.resolve(void null);
  }
}
