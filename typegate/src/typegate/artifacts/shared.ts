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
  redisClient: Redis;
  expirationQueueKey: string;
  expirationTimerId: number;
}

interface ExpirationQueueValue {
  url: string;
  expirationTime: number;
}

async function initRemoteUploadUrlStore(
  redisConfig: RedisConnectOptions,
): Promise<RemoteUploadUrlStore> {
  const redisClient = await connect(redisConfig);
  const expirationQueueKey = "queue:expiration";
  const expirationTimerId = setInterval(async () => {
    const now = jwt.getNumericDate(new Date());
    while (await redisClient.llen(expirationQueueKey) > 0) {
      const firstInQueue = await redisClient.lindex("expirationQueueKey", 0);
      if (!firstInQueue) {
        throw new Error("Expiration queue is empty but should not be.");
      }
      const { url, expirationTime } = deserializeToCustom<ExpirationQueueValue>(
        firstInQueue,
      );
      if (expirationTime > now) {
        break;
      }
      redisClient.lpop(expirationQueueKey);
      redisClient.del(url);
    }
  }, 5000);

  return { redisClient, expirationQueueKey, expirationTimerId };
}

function deinitRemoteUploadUrlStore(uploadUrls: RemoteUploadUrlStore) {
  uploadUrls.redisClient.quit();
  clearInterval(uploadUrls.expirationTimerId);
}

function serializeToRedisValue<T>(value: T): string {
  return JSON.stringify(value);
}

function deserializeToCustom<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
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
      Body: fileContent,
      Key: resolveS3Key(hash),
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
    meta: ArtifactMeta,
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
    this.#uploadUrls.redisClient.set(
      url,
      serializeToRedisValue<ArtifactMeta>(meta),
    );
    const queueValue: ExpirationQueueValue = { url, expirationTime };
    await this.#uploadUrls.redisClient.rpush(
      this.#uploadUrls.expirationQueueKey,
      serializeToRedisValue(queueValue),
    );

    return url;
  }

  override async takeUploadUrl(
    url: URL,
  ): Promise<
    ArtifactMeta
  > {
    ArtifactStore.validateUploadUrl(url);

    const meta = await this.#uploadUrls.redisClient.get(url.toString());
    if (!meta) {
      throw new Error("Invalid upload URL");
    }

    this.#uploadUrls.redisClient.del(url.toString());
    return Promise.resolve(deserializeToCustom<ArtifactMeta>(meta));
  }

  override close(): Promise<void> {
    deinitRemoteUploadUrlStore(this.#uploadUrls);
    return Promise.resolve(void null);
  }
}
