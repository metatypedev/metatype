// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { connect, RedisConnectOptions } from "redis";
import { createHash } from "node:crypto";
import { S3 } from "aws-sdk/client-s3";
import { getLocalPath, STORE_DIR, STORE_TEMP_DIR } from "./mod.ts";
import { ArtifactMeta, ArtifactStore } from "./mod.ts";
import { HashTransformStream } from "../../utils/hash.ts";
import { resolve } from "std/path/resolve.ts";
import { SyncConfig } from "../../sync/config.ts";
import { Redis } from "redis";
import * as jwt from "jwt";
import { readAll } from "https://deno.land/std@0.129.0/streams/conversion.ts";

export interface RemoteUploadUrlStore {
  mapToMeta: Redis;
  expirationQueue: [string, number][];
  expirationTimerId: number;
}

async function initRemoteUploadUrlStore(
  redisConfig: RedisConnectOptions,
): Promise<RemoteUploadUrlStore> {
  const mapToMeta = await connect(redisConfig);
  const expirationQueue: [string, number][] = [];
  const expirationTimerId = setInterval(() => {
    const now = jwt.getNumericDate(new Date());
    while (expirationQueue.length > 0) {
      const [url, expirationTime] = expirationQueue[0];
      if (expirationTime > now) {
        break;
      }
      expirationQueue.shift();
      mapToMeta.del(url);
    }
  }, 5000);
  return { mapToMeta, expirationQueue, expirationTimerId };
}

function deinitRemoteUploadUrlStore(uploadUrls: RemoteUploadUrlStore) {
  uploadUrls.mapToMeta.quit();
  clearInterval(uploadUrls.expirationTimerId);
  uploadUrls.expirationQueue = [];
}

function serializeArtifactMeta(meta: ArtifactMeta): string {
  return JSON.stringify(meta);
}

function deserializeToArtifactMeta(value: string): ArtifactMeta {
  try {
    return JSON.parse(value) as ArtifactMeta;
  } catch (error) {
    throw error;
  }
}

function resolveS3Key(hash: string) {
  return `${REMOTE_ARTIFACT_DIR}/${hash}`;
}

const REMOTE_ARTIFACT_DIR = "artifacts-cache";

export class SharedArtifactStore extends ArtifactStore {
  #uploadUrls: RemoteUploadUrlStore;
  #s3!: S3;
  #syncConfig: SyncConfig;

  static async init(syncConfig: SyncConfig) {
    const urlStore = await initRemoteUploadUrlStore(syncConfig.redis);
    await Deno.mkdir(STORE_DIR, { recursive: true });
    await Deno.mkdir(STORE_TEMP_DIR, { recursive: true });

    return new SharedArtifactStore(syncConfig, urlStore);
  }

  constructor(syncConfig: SyncConfig, urlStore: RemoteUploadUrlStore) {
    super();
    this.#s3 = new S3(syncConfig.s3);
    this.#syncConfig = syncConfig;
    this.#uploadUrls = urlStore;
  }

  override async persist(stream: ReadableStream<any>): Promise<string> {
    const tmpFile = await Deno.makeTempFile({
      dir: STORE_TEMP_DIR,
    });
    const file = await Deno.open(tmpFile, {
      write: true,
      truncate: true,
    });
    const hasher = createHash("sha256");
    await stream
      .pipeThrough(new HashTransformStream(hasher))
      .pipeTo(file.writable);

    const hash = hasher.digest("hex");

    const readFile = await Deno.open(tmpFile, { read: true });
    // Read file content into a Uint8Array
    const fileContent = await readAll(readFile);
    console.log(`Persisting artifact to S3`);
    await this.#s3.putObject({
      Bucket: this.#syncConfig.s3Bucket,
      Key: resolveS3Key(hash),
      Body: fileContent,
    });

    return hash;
  }

  override async delete(hash: string): Promise<void> {
    await this.#s3.deleteObject({
      Bucket: this.#syncConfig.s3Bucket,
      Key: resolveS3Key(hash),
    });
  }

  override async has(hash: string): Promise<boolean> {
    try {
      await this.#s3.headObject({
        Bucket: this.#syncConfig.s3Bucket,
        Key: resolveS3Key(hash),
      });
      return true;
    } catch {
      return false;
    }
  }

  override async getLocalPath(
    meta: ArtifactMeta,
    deps?: ArtifactMeta[] | undefined,
  ): Promise<string> {
    for (const dep of deps ?? []) {
      await this.#downloadFromRemote(dep.hash, dep.relativePath);
      await getLocalPath(dep);
    }

    await this.#downloadFromRemote(meta.hash, meta.relativePath);
    return await getLocalPath(meta);
  }

  async #downloadFromRemote(hash: string, relativePath: string) {
    if (await this.#existsLocally(hash)) {
      return;
    }
    const targetFile = resolve(STORE_DIR, hash);
    const response = await this.#s3.getObject({
      Bucket: this.#syncConfig.s3Bucket,
      Key: resolveS3Key(hash),
    });

    if (response.$metadata.httpStatusCode === 404) {
      throw new Error(
        `Artifact ${relativePath} with hash ${relativePath} not found`,
      );
    }

    if (response.Body) {
      const file =
        (await Deno.open(targetFile, { write: true, create: true })).writable;
      await response.Body.transformToWebStream().pipeTo(file);
    } else {
      throw new Error(`Failed to download artifact ${relativePath} from s3`);
    }
  }

  async #existsLocally(hash: string) {
    try {
      await Deno.stat(resolve(STORE_DIR, hash));
      return true;
    } catch {
      return false;
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
    this.#uploadUrls.mapToMeta.set(url, serializeArtifactMeta(meta));
    this.#uploadUrls.expirationQueue.push([url, expirationTime]);

    return url;
  }

  override async takeUploadUrl(
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

    const meta = await this.#uploadUrls.mapToMeta.get(url.toString());
    if (!meta) {
      throw new Error("Invalid upload URL");
    }

    this.#uploadUrls.mapToMeta.del(url.toString());
    return Promise.resolve(deserializeToArtifactMeta(meta));
  }

  override close(): Promise<void> {
    deinitRemoteUploadUrlStore(this.#uploadUrls);
    return Promise.resolve(void null);
  }
}
