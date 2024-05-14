// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { sha256, signJWT, verifyJWT } from "@typegate/crypto.ts";
import { getLogger } from "@typegate/log.ts";
import * as jwt from "jwt";
import { z } from "zod";
import { dirname } from "std/path/dirname.ts";
import { resolve } from "std/path/resolve.ts";
import { exists } from "std/fs/exists.ts";
// until deno supports it...
import { AsyncDisposableStack } from "dispose";
import { BaseError, ErrorSource, NotImplemented } from "../errors.ts";

class InvalidUploadUrl extends BaseError {
  constructor(url: URL, kind: "unknown" | "expired" = "unknown") {
    super(
      import.meta,
      ErrorSource.User,
      `${kind} upload URL: ${url.toString()}`,
      403,
    );
  }
}

export class ArtifactError extends BaseError {
  constructor(message: string, module: ImportMeta | string) {
    super(module, ErrorKind.System, message);
  }
}

const logger = getLogger(import.meta);

export interface Dirs {
  cache: string;
  temp: string;
  artifacts: string;
}

function getUploadPath(tgName: string) {
  return `/${tgName}/artifacts`;
}

async function getLocalParentDir(
  entrypoint: ArtifactMeta,
  deps: ArtifactMeta[],
) {
  const uniqueStr = deps
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
    .reduce(
      (acc, dep) => `${acc};${dep.relativePath}.${dep.hash}`,
      `${entrypoint.relativePath}.${entrypoint.hash}`,
    );

  return await sha256(uniqueStr);
}

export async function getLocalPath(
  meta: ArtifactMeta,
  parentDirName: string,
  dirs: Dirs,
) {
  const cachedPath = resolve(dirs.cache, meta.hash);
  const localPath = resolve(
    dirs.artifacts,
    parentDirName,
    meta.typegraphName,
    meta.relativePath,
  );

  if (await exists(localPath)) {
    // always assume same versions of the arifacts - no need to check hash.
    return localPath;
  }

  await Deno.mkdir(dirname(localPath), { recursive: true });
  // the old artifacts are always removed on typegraph update.
  await Deno.remove(localPath, { recursive: true }).catch(() => {});
  await Deno.link(cachedPath, localPath);

  return localPath;
}

export const artifactMetaSchema = z.object({
  typegraphName: z.string(),
  relativePath: z.string(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  sizeInBytes: z.number(),
});

export type ArtifactMeta = z.infer<typeof artifactMetaSchema>;

export interface ArtifactPersistence extends AsyncDisposable {
  dirs: Dirs;
  save(stream: ReadableStream): Promise<string>;
  delete(hash: string): Promise<void>;
  has(hash: string): Promise<boolean>;
  /** Fetch the artifact to local file system and returns the path */
  fetch(hash: string): Promise<string>;
}

export interface UploadEndpointManager extends AsyncDisposable {
  prepareUpload(
    meta: ArtifactMeta,
    origin: URL,
    persistence: ArtifactPersistence,
  ): Promise<string | null>;
  takeUploadUrl(url: URL): Promise<ArtifactMeta>;
}

export class ArtifactStore implements AsyncDisposable {
  #disposed = false;

  static async init(
    persistence: ArtifactPersistence,
    uploadEndpoints: UploadEndpointManager,
    refCounter: RefCounter,
  ) {
    await using stack = new AsyncDisposableStack();
    stack.use(persistence);
    stack.use(uploadEndpoints);
    stack.use(refCounter);
    return await Promise.resolve(
      new ArtifactStore(
        persistence,
        uploadEndpoints,
        refCounter,
        stack.move(),
      ),
    );
  }

  constructor(
    public persistence: ArtifactPersistence,
    private uploadEndpoints: UploadEndpointManager,
    private refCounter: RefCounter,
    private disposables: AsyncDisposableStack,
  ) {
  }

  async [Symbol.asyncDispose]() {
    if (this.#disposed) return;
    this.#disposed = true;
    await this.disposables[Symbol.asyncDispose]();
  }

  async updateRefCounts(
    added: Set<string>,
    removed: Set<string>,
  ): Promise<void> {
    const increments: string[] = [];
    const decrements: string[] = [];

    for (const hash of added) {
      if (!removed.has(hash)) {
        increments.push(hash);
      } else {
        removed.delete(hash);
      }
    }
    decrements.push(...removed);

    await Promise.all([
      ...increments.map((hash) => this.refCounter.increment(hash)),
      ...decrements.map((hash) => this.refCounter.decrement(hash)),
    ]);
  }

  async runArtifactGC(full = false) {
    logger.info("Running artifact GC");
    if (full) {
      throw new NotImplemented(import.meta, "full GC");
    }
    const garbage = await this.refCounter.takeGarbage();
    logger.info(`Found ${garbage.length} garbage artifacts: ${garbage}`);

    const res = await Promise.allSettled(
      garbage.map((hash) => this.persistence.delete(hash)),
    );

    res.forEach((r, i) => {
      if (r.status === "rejected") {
        logger.error("Error when deleting artifact", garbage[i], r.reason);
      }
    });
  }

  async getLocalPath(
    meta: ArtifactMeta,
    deps: ArtifactMeta[] = [],
  ): Promise<string> {
    const parentDirName = await getLocalParentDir(meta, deps);
    for (const dep of deps) {
      await this.persistence.fetch(dep.hash);
      await getLocalPath(dep, parentDirName, this.persistence.dirs);
    }

    await this.persistence.fetch(meta.hash);
    return getLocalPath(meta, parentDirName, this.persistence.dirs);
  }

  prepareUpload(meta: ArtifactMeta, origin: URL) {
    return this.uploadEndpoints.prepareUpload(meta, origin, this.persistence);
  }

  takeUploadUrl(url: URL) {
    return this.uploadEndpoints.takeUploadUrl(url);
  }

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
    expireSec: number,
  ): Promise<URL> {
    const uuid = crypto.randomUUID();
    const token = await signJWT({ uuid, expiresIn: expireSec }, expireSec);
    const url = new URL(getUploadPath(tgName), origin);
    url.searchParams.set("token", token);
    return url;
  }

  static async validateUploadUrl(url: URL) {
    const token = url.searchParams.get("token");
    if (/^\/([^\/])\/artifacts/.test(url.pathname) || !token) {
      throw new InvalidUploadUrl(url);
    }

    const context = await verifyJWT(token);
    if ((context.exp as number) < jwt.getNumericDate(new Date())) {
      throw new InvalidUploadUrl(url, "expired");
    }

    return token;
  }
}

export interface RefCounter extends AsyncDisposable {
  increment(key: string): Promise<void>;
  decrement(key: string): Promise<void>;
  resetAll(): Promise<void>;
  takeGarbage(): Promise<Array<string>>;

  // for debugging purpose; output the current state of the ref counter
  inspect(label: string): Promise<void>;
}
