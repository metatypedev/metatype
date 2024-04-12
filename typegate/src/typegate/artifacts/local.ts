// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { resolve } from "std/path/resolve.ts";
import { HashTransformStream } from "../../utils/hash.ts";
import {
  ArtifactMeta,
  ArtifactPersistence,
  ArtifactStore,
  RefCounter,
  UploadEndpointManager,
} from "./mod.ts";
import { createHash } from "node:crypto";
import * as jwt from "jwt";
import { join } from "std/path/join.ts";
import { exists } from "std/fs/exists.ts";

export interface UploadUrlStore {
  mapToMeta: Map<string, ArtifactMeta>;
  expirationQueue: [string, number][];
  expirationTimerId: number;
}

interface Dirs {
  cache: string;
  temp: string;
  artifacts: string;
}

export class LocalArtifactPersistence implements ArtifactPersistence {
  static async init(baseDir: string) {
    const cacheDir = join(baseDir, "artifacts-cache");
    const tempDir = join(cacheDir, "tmp");
    const artifactsDir = join(baseDir, "artifacts");
    await Deno.mkdir(tempDir, { recursive: true });
    await Deno.mkdir(artifactsDir, { recursive: true });
    return new LocalArtifactPersistence({
      cache: cacheDir,
      temp: tempDir,
      artifacts: artifactsDir,
    });
  }

  constructor(private dirs: Dirs) {
  }

  async [Symbol.asyncDispose]() {
    await Deno.remove(this.dirs.cache, { recursive: true });
    await Deno.remove(this.dirs.artifacts, { recursive: true });
  }

  async save(stream: ReadableStream): Promise<string> {
    const tmpFile = await Deno.makeTempFile({ dir: this.dirs.temp });
    const file = await Deno.open(tmpFile, { write: true, truncate: true });
    const hasher = createHash("sha256");
    await stream
      .pipeThrough(new HashTransformStream(hasher))
      .pipeTo(file.writable);

    const hash = hasher.digest("hex");
    const targetFile = resolve(this.dirs.cache, hash);
    console.log(`Persisting artifact to ${targetFile}`);
    await Deno.rename(tmpFile, targetFile);

    return hash;
  }

  async delete(hash: string) {
    await Deno.remove(this.resolveCache(hash));
  }

  has(hash: string) {
    return exists(this.resolveCache(hash));
  }

  async fetch(hash: string) {
    const cache = this.resolveCache(hash);
    if (await exists(cache)) {
      return cache;
    } else {
      throw new Error(`Artifact '${hash}' not found`);
    }
  }

  resolveCache(hash: string) {
    return resolve(this.dirs.cache, hash);
  }
}

class LocalUploadEndpointManager implements UploadEndpointManager {
  #mapToMeta: Map<string, ArtifactMeta>;
  #expirationQueue: [string, number][];
  #expirationTimerId: number;

  constructor(private expireSec = 5 * 60) {
    this.#mapToMeta = new Map();
    this.#expirationQueue = [];

    // Clean up expired upload URLs every 5 seconds
    this.#expirationTimerId = setInterval(() => {
      const now = jwt.getNumericDate(new Date());
      while (this.#expirationQueue.length > 0) {
        const [url, expirationTime] = this.#expirationQueue[0];
        if (expirationTime > now) {
          break;
        }
        this.#expirationQueue.shift();
        this.#mapToMeta.delete(url);
      }
    }, 5000);
  }

  async [Symbol.asyncDispose]() {
    clearInterval(this.#expirationTimerId);
    await Promise.resolve(void null);
  }

  async prepareUpload(
    meta: ArtifactMeta,
    origin: URL,
    persistence: ArtifactPersistence,
  ) {
    if (await persistence.has(meta.hash)) {
      return null;
    }
    const url = await ArtifactStore.createUploadUrl(
      origin,
      meta.typegraphName,
      this.expireSec,
    );
    const token = url.searchParams.get("token");
    if (!token) {
      throw new Error("Invalid upload URL generated");
    }
    this.#mapToMeta.set(token, meta);
    this.#expirationQueue.push([token, jwt.getNumericDate(this.expireSec)]);

    return url.toString();
  }

  async takeUploadUrl(url: URL) {
    const token = await ArtifactStore.validateUploadUrl(url);

    const meta = this.#mapToMeta.get(token);
    if (!meta) {
      throw new Error("Invalid upload URL");
    }

    this.#mapToMeta.delete(token);
    return Promise.resolve(meta);
  }
}

class InMemoryRefCounter implements RefCounter {
  #refCounts: Map<string, number> = new Map();
  #byRefCounts: Map<number, Set<string>> = new Map();

  async [Symbol.asyncDispose]() {
    await Promise.resolve(void null);
  }

  async increment(key: string) {
    this.#updateRefCount(key, (count) => count + 1);
    await Promise.resolve(void null);
  }

  async decrement(key: string) {
    this.#updateRefCount(key, (count) => count ? count - 1 : 0);
    await Promise.resolve(void null);
  }

  async resetAll() {
    this.#refCounts.clear();
    this.#byRefCounts.clear();
    await Promise.resolve(void null);
  }

  takeGarbage(): Promise<string[]> {
    const garbage = [...this.#byRefCounts.get(0) ?? []];
    for (const key of garbage) {
      this.#refCounts.delete(key);
    }
    return Promise.resolve(garbage);
  }

  #updateRefCount(key: string, update: (count: number) => number) {
    const oldCount = this.#refCounts.get(key) ?? 0;
    const newCount = update(oldCount);
    if (oldCount === newCount) return;

    this.#refCounts.set(key, newCount);
    if (!this.#byRefCounts.get(oldCount)?.delete(key)) {
      throw new Error("RefCountStore: inconsistent state");
    }

    let set = this.#byRefCounts.get(newCount);
    if (!set) {
      set = new Set();
      this.#byRefCounts.set(newCount, set);
    }
    set.add(key);
  }
}

export async function createLocalArtifactStore(
  baseDir: string,
): Promise<ArtifactStore> {
  const persistence = await LocalArtifactPersistence.init(baseDir);
  const uploadEndpoints = new LocalUploadEndpointManager();
  const refCounter = new InMemoryRefCounter();
  return ArtifactStore.init(persistence, uploadEndpoints, refCounter);
}
