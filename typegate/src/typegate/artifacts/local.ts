// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { resolve } from "std/path/resolve.ts";
import config from "../../config.ts";
import { HashTransformStream } from "../../utils/hash.ts";
import { ArtifactMeta, ArtifactStore } from "./mod.ts";
import { createHash } from "node:crypto";
import * as jwt from "jwt";

// The directory where artifacts are stored -- by hash
const STORE_DIR = `${config.tmp_dir}/artifacts-cache`;
const STORE_TEMP_DIR = `${config.tmp_dir}/artifacts-cache/tmp`;
const ARTIFACTS_DIR = `${config.tmp_dir}/artifacts`;

interface UploadUrlStore {
  mapToMeta: Map<string, ArtifactMeta>;
  expirationQueue: [string, number][];
  expirationTimerId: number;
}

function initUploadUrlStore() {
  const mapToMeta = new Map<string, ArtifactMeta>();
  const expirationQueue: [string, number][] = [];
  const expirationTimerId = setInterval(() => {
    const now = jwt.getNumericDate(new Date());
    while (expirationQueue.length > 0) {
      const [url, expirationTime] = expirationQueue[0];
      if (expirationTime > now) {
        break;
      }
      expirationQueue.shift();
      mapToMeta.delete(url);
    }
  }, 5000);
  return { mapToMeta, expirationQueue, expirationTimerId };
}

function deinitUploadUrlStore(uploadUrls: UploadUrlStore) {
  clearInterval(uploadUrls.expirationTimerId);
  uploadUrls.mapToMeta.clear();
  uploadUrls.expirationQueue = [];
}

export class LocalArtifactStore extends ArtifactStore {
  #uploadUrls: UploadUrlStore;

  async init() {
    await Deno.mkdir(STORE_DIR, { recursive: true });
    await Deno.mkdir(STORE_TEMP_DIR, { recursive: true });

    return new LocalArtifactStore();
  }

  constructor() {
    super();
    this.#uploadUrls = initUploadUrlStore();
  }

  override async persist(stream: ReadableStream): Promise<string> {
    const tmpFile = await Deno.makeTempFile({ dir: STORE_TEMP_DIR });
    const file = await Deno.open(tmpFile, { write: true, truncate: true });
    const hasher = createHash("sha256");
    await stream
      .pipeThrough(new HashTransformStream(hasher))
      .pipeTo(file.writable);
    file.close();

    const hash = hasher.digest("hex");
    const targetFile = resolve(STORE_DIR, hash);
    await Deno.rename(tmpFile, targetFile);

    return hash;
  }

  override async delete(hash: string) {
    await Deno.remove(resolve(STORE_DIR, hash));
  }

  override async has(hash: string) {
    try {
      await Deno.stat(resolve(STORE_DIR, hash));
      return true;
    } catch {
      return false;
    }
  }

  override async getLocalPath(meta: ArtifactMeta, deps: ArtifactMeta[] = []) {
    for (const dep of deps) {
      this.#assertArtifactExist(dep.hash, dep.typegraphName);
      await getLocalPath(dep);
    }

    this.#assertArtifactExist(meta.hash, meta.typegraphName);
    return getLocalPath(meta);
  }

  override async prepareUpload(meta: ArtifactMeta, origin: URL) {
    // should not be uploaded again
    if (await this.has(ArtifactStore.getArtifactKey(meta))) {
      return null;
    }

    const [url, expirationTime] = await ArtifactStore.createUploadUrl(origin);
    this.#uploadUrls.mapToMeta.set(url, meta);
    this.#uploadUrls.expirationQueue.push([url, expirationTime]);

    return url;
  }

  override takeUploadUrl(url: URL): Promise<ArtifactMeta> {
    ArtifactStore.validateUploadUrl(url);

    const meta = this.#uploadUrls.mapToMeta.get(url.toString());
    if (!meta) {
      throw new Error("Invalid upload URL");
    }

    this.#uploadUrls.mapToMeta.delete(url.toString());
    return Promise.resolve(meta);
  }

  #assertArtifactExist(key: string, tgName: string) {
    if (!this.has(key)) {
      throw new Error(
        `Artifact with key '${key}' is not available for typegraph '${tgName}'`,
      );
    }
  }

  override close() {
    deinitUploadUrlStore(this.#uploadUrls);
    return Promise.resolve(void null);
  }
}

async function getLocalPath(meta: ArtifactMeta) {
  const cachedPath = resolve(STORE_DIR, meta.hash);
  const localPath = resolve(
    ARTIFACTS_DIR,
    meta.typegraphName,
    meta.relativePath,
  );
  await Deno.link(cachedPath, localPath);

  return localPath;
}
