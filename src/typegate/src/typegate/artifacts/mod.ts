// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { sha256, type TypegateCryptoKeys } from "../../crypto.ts";
import { getLogger } from "../../log.ts";
import * as jwt from "jwt";
import { z } from "zod";
import { dirname } from "@std/path/dirname";
import { resolve } from "@std/path/resolve";
import { exists } from "@std/fs/exists";
// until deno supports it...
import { AsyncDisposableStack } from "dispose";
import { BaseError, ErrorKind, NotImplemented } from "../../errors.ts";

class InvalidUploadToken extends BaseError {
  constructor(token: string, kind: "unknown" | "expired" = "unknown") {
    super(import.meta, ErrorKind.User, `${kind} upload token: ${token}`, 403);
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

async function readyLocalPath(
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
  save(stream: ReadableStream, size: number): Promise<string>;
  delete(hash: string): Promise<void>;
  has(hash: string): Promise<boolean>;
  /** Fetch the artifact to local file system and returns the path */
  fetch(hash: string): Promise<string>;
}

export interface UploadEndpointManager extends AsyncDisposable {
  prepareUpload(
    meta: ArtifactMeta,
    persistence: ArtifactPersistence,
  ): Promise<string | null>;
  takeArtifactMeta(token: string): Promise<ArtifactMeta>;
}

export class ArtifactStore implements AsyncDisposable {
  #disposed = false;
  #localPathMemo = new Map<string, Promise<string>>();

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
      new ArtifactStore(persistence, uploadEndpoints, refCounter, stack.move()),
    );
  }

  constructor(
    public persistence: ArtifactPersistence,
    private uploadEndpoints: UploadEndpointManager,
    private refCounter: RefCounter,
    private disposables: AsyncDisposableStack,
  ) {}

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

  #resolveLocalPath(dep: ArtifactMeta, parentDirName: string) {
    // we combine the parentDirName with the hash for the local
    // memo since the same artifact might be by different
    // relative solutions
    // FIXME: use the artifact set solution from substantial for Deno rt
    let promise = this.#localPathMemo.get(dep.hash + parentDirName);
    if (!promise) {
      promise = readyLocalPath(dep, parentDirName, this.persistence.dirs);
      this.#localPathMemo.set(dep.hash + parentDirName, promise);
    }
    return promise;
  }

  async getLocalPath(
    meta: ArtifactMeta,
    deps: ArtifactMeta[] = [],
  ): Promise<string> {
    const parentDirName = await getLocalParentDir(meta, deps);
    for (const dep of deps) {
      await this.persistence.fetch(dep.hash);
      await this.#resolveLocalPath(dep, parentDirName);
    }

    await this.persistence.fetch(meta.hash);
    return this.#resolveLocalPath(meta, parentDirName);
  }

  async getInlineArtifact(
    tgName: string,
    code: string,
    ext: string,
    transform = (code: string) => code,
  ) {
    const hash = await sha256(code);
    const path = resolve(
      this.persistence.dirs.cache,
      "inline",
      tgName,
      hash + ext,
    );
    if (await exists(path)) {
      return path;
    }
    await Deno.mkdir(dirname(path), { recursive: true });
    await Deno.writeTextFile(path, transform(code));
    return path;
  }

  prepareUpload(meta: ArtifactMeta) {
    return this.uploadEndpoints.prepareUpload(meta, this.persistence);
  }

  takeArtifactMeta(token: string) {
    return this.uploadEndpoints.takeArtifactMeta(token);
  }

  /** unique identifier for an artifact (file content) */
  static getArtifactKey(meta: ArtifactMeta) {
    // TODO what happens on hash collision?
    return meta.hash;
  }

  /**
   * Get the URL to upload an artifact to.
   * @param origin The origin of the request.
   * @returns The URL to upload the artifact to and the expiration time.
   */
  static async createUploadToken(
    expireSec: number,
    crypto: TypegateCryptoKeys,
  ): Promise<string> {
    const uuid = globalThis.crypto.randomUUID();
    const token = await crypto.signJWT(
      { uuid, expiresIn: expireSec },
      expireSec,
    );
    return token;
  }

  static async validateUploadToken(token: string, crypto: TypegateCryptoKeys) {
    const context = await crypto.verifyJWT(token);
    if ((context.exp as number) < jwt.getNumericDate(new Date())) {
      throw new InvalidUploadToken(token, "expired");
    }
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
