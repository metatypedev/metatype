// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { connect, Redis, RedisConnectOptions } from "redis";
import { getLogger } from "@typegate/log.ts";
import { createHash } from "node:crypto";
import { TypegateCryptoKeys } from "../../crypto.ts";
import { S3 } from "aws-sdk/client-s3";
import {
  ArtifactPersistence,
  RefCounter,
  UploadEndpointManager,
} from "./mod.ts";
import { ArtifactMeta, ArtifactStore } from "./mod.ts";
import { HashTransformStream } from "../../utils/hash.ts";
import { SyncConfig } from "../../config.ts";
import { LocalArtifactPersistence } from "./local.ts";
import { exists } from "@std/fs/exists";
import { dirname } from "@std/path/";
import { chunk } from "@std/collections/chunk";
import { ArtifactError } from "./mod.ts";

const logger = getLogger(import.meta);

export interface RemoteUploadUrlStore {
  redisClient: Redis;
}

// TODO change to 'typegate:artifacts:metadata:<token>'
function getRedisArtifactMetaKey(token: string) {
  return `typegate:artifacts:upload-urls:${token}`;
}

function serializeToRedisValue<T>(value: T): string {
  return JSON.stringify(value);
}
function deserializeToCustom<T>(value: string): T {
  return JSON.parse(value) as T;
}

export function resolveS3Key(bucket: string, hash: string) {
  return `${bucket}/${REMOTE_ARTIFACT_DIR}/${hash}`;
}

const REMOTE_ARTIFACT_DIR = "artifacts-cache";

class SharedArtifactPersistence implements ArtifactPersistence {
  static async init(
    baseDir: string,
    syncConfig: SyncConfig,
  ): Promise<SharedArtifactPersistence> {
    const localShadow = await LocalArtifactPersistence.init(baseDir);
    const s3 = new S3(syncConfig.s3);
    return new SharedArtifactPersistence(localShadow, s3, syncConfig.s3Bucket);
  }

  constructor(
    private localShadow: LocalArtifactPersistence,
    private s3: S3,
    private s3Bucket: string,
  ) {}

  get dirs() {
    return this.localShadow.dirs;
  }

  async [Symbol.asyncDispose]() {
    await this.localShadow[Symbol.asyncDispose]();
    this.s3.destroy();
  }

  async save(stream: ReadableStream<any>): Promise<string> {
    const hasher = createHash("sha256");

    // TODO compatibility with Node.js streams?
    // const stream2 = stream.pipeThrough(new HashTransformStream(hasher));
    //
    // const tempKey = resolveS3Key(
    //   `tmp/${Math.random().toString(36).substring(2)}`,
    // );
    //
    // const _ = await this.s3.putObject({
    //   Bucket: this.s3Bucket,
    //   Body: stream2,
    //   Key: tempKey,
    // });
    // const hash = hasher.digest("hex");
    //
    // await this.s3.copyObject({
    //   Bucket: this.s3Bucket,
    //   CopySource: tempKey,
    //   Key: resolveS3Key(hash),
    // });
    //
    // await this.s3.deleteObject({
    //   Bucket: this.s3Bucket,
    //   Key: tempKey,
    // });
    //
    // return hash;

    const tmpFile = await Deno.makeTempFile({ dir: this.dirs.temp });
    const file = await Deno.open(tmpFile, { write: true, truncate: true });
    await stream
      .pipeThrough(new HashTransformStream(hasher))
      .pipeTo(file.writable);

    const hash = hasher.digest("hex");
    const body = await Deno.readFile(tmpFile);
    logger.info(`persisting artifact to S3: ${hash}`);
    const _ = await this.s3.putObject({
      Bucket: this.s3Bucket,
      Body: body,
      Key: resolveS3Key(this.s3Bucket, hash),
    });

    return hash;
  }

  async delete(hash: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.s3Bucket,
      Key: resolveS3Key(this.s3Bucket, hash),
    });
  }

  async has(hash: string): Promise<boolean> {
    try {
      const _ = await this.s3.headObject({
        Bucket: this.s3Bucket,
        Key: resolveS3Key(this.s3Bucket, hash),
      });
      return true;
    } catch {
      return false;
    }
  }

  async fetch(hash: string): Promise<string> {
    const targetFile = this.localShadow.resolveCache(hash);

    if (await exists(targetFile)) {
      return targetFile;
    }

    const response = await this.s3.getObject({
      Bucket: this.s3Bucket,
      Key: resolveS3Key(this.s3Bucket, hash),
    });

    if (response.$metadata.httpStatusCode === 404) {
      throw new ArtifactError(
        `Artifact '${hash}' not found in S3`,
        import.meta,
      );
    }

    if (response.Body) {
      await Deno.mkdir(dirname(targetFile), { recursive: true });
      const file = (await Deno.open(targetFile, { write: true, create: true }))
        .writable;
      await response.Body.transformToWebStream().pipeTo(file);
    } else {
      throw new ArtifactError(
        `Failed to download artifact with hash ${hash}`,
        import.meta,
      );
    }

    return this.localShadow.fetch(hash);
  }
}

class SharedUploadEndpointManager implements UploadEndpointManager {
  static async init(
    syncConfig: SyncConfig,
    cryptoKeys: TypegateCryptoKeys,
    expireSec = 5 * 60,
  ) {
    const redis = await connect(syncConfig.redis);
    return new SharedUploadEndpointManager(redis, cryptoKeys, expireSec);
  }

  private constructor(
    private redis: Redis,
    private cryptoKeys: TypegateCryptoKeys,
    private expireSec: number,
  ) {}

  async [Symbol.asyncDispose]() {
    await this.redis.quit();
  }

  async prepareUpload(
    meta: ArtifactMeta,
    persistence: ArtifactPersistence,
  ): Promise<string | null> {
    // should not be uploaded again
    if (await persistence.has(meta.hash)) {
      return null;
    }

    const token = await ArtifactStore.createUploadToken(
      this.expireSec,
      this.cryptoKeys,
    );
    const _ = await this.redis.eval(
      /* lua */ `
        redis.call('SET', KEYS[1], ARGV[1])
        redis.call('EXPIRE', KEYS[1], ARGV[2])
      `,
      [getRedisArtifactMetaKey(token)],
      [serializeToRedisValue(meta), this.expireSec],
    );

    return token;
  }

  async takeArtifactMeta(token: string): Promise<ArtifactMeta> {
    await ArtifactStore.validateUploadToken(token, this.cryptoKeys);
    const meta = await this.redis.eval(
      /* lua */ `
        local meta = redis.call('GET', KEYS[1])
        redis.call('DEL', KEYS[1])
        return meta
      `,
      [getRedisArtifactMetaKey(token)],
      [],
    );
    return Promise.resolve(deserializeToCustom<ArtifactMeta>(meta as string));
  }
}

export const REDIS_REF_COUNTER = "typegate:artifacts:refcounts";

export class SharedArtifactRefCounter implements RefCounter {
  static async init(
    redisConfig: RedisConnectOptions,
  ): Promise<SharedArtifactRefCounter> {
    return new SharedArtifactRefCounter(await connect(redisConfig));
  }

  #redisClient: Redis;

  private constructor(redisClient: Redis) {
    this.#redisClient = redisClient;
  }

  async [Symbol.asyncDispose]() {
    await this.#redisClient.quit();
  }

  async increment(key: string) {
    await this.#redisClient.zincrby(REDIS_REF_COUNTER, 1, key);
  }

  async decrement(key: string) {
    // TODO what for negative values?
    await this.#redisClient.zincrby(REDIS_REF_COUNTER, -1, key);
  }

  async resetAll() {
    await this.#redisClient.del(REDIS_REF_COUNTER);
  }

  // TODO we should not remove them until they are garbage collected
  async takeGarbage(): Promise<string[]> {
    const keys = await this.#redisClient.eval(
      /* lua */ `
        local keys = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', '0')
        redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', '0')
        return keys
      `,
      [REDIS_REF_COUNTER],
      [],
    );

    return keys as string[];
  }

  // for debugging purpose
  async inspect(label = "") {
    const data = await this.#redisClient.zrange(REDIS_REF_COUNTER, 0, -1, {
      withScore: true,
    });
    console.log(
      "refCounts",
      label,
      chunk(data, 2).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value }),
        {},
      ),
    );
  }
}

export async function createSharedArtifactStore(
  baseDir: string,
  syncConfig: SyncConfig,
  cryptoKeys: TypegateCryptoKeys,
): Promise<ArtifactStore> {
  const persistence = await SharedArtifactPersistence.init(baseDir, syncConfig);
  const uploadEndpoints = await SharedUploadEndpointManager.init(
    syncConfig,
    cryptoKeys,
  );
  const refCounter = await SharedArtifactRefCounter.init(syncConfig.redis);
  return ArtifactStore.init(persistence, uploadEndpoints, refCounter);
}
