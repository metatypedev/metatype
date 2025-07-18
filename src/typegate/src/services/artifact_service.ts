// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import {
  type ArtifactMeta,
  artifactMetaSchema,
  type ArtifactStore,
} from "../typegate/artifacts/mod.ts";
import { z } from "zod";
import { getLogger } from "../log.ts";
import { BaseError, UnknownError } from "../errors.ts";
import { jsonError } from "./responses.ts";
import { jsonOk } from "./responses.ts";

const logger = getLogger(import.meta);

const prepareUploadBodySchema = z.array(artifactMetaSchema);

export class ArtifactService {
  constructor(private store: ArtifactStore) {}

  async handle(request: Request, tgName: string) {
    const url = new URL(request.url);
    // [1] is the typegraph name; [2] is the service name
    const operation = url.pathname.split("/")[3];

    if (operation === "prepare-upload") {
      if (request.method !== "POST") {
        logger.warn("Method not allowed", request.method);
        return jsonError({
          message: `method not allowed: ${request.method}`,
          status: 405,
        });
      }

      let metaList: Array<ArtifactMeta>;
      try {
        metaList = prepareUploadBodySchema.parse(await request.json());
      } catch (error: any) {
        logger.error("Failed to parse data", error);
        return jsonError({
          message: `invalid request body: ${error.message}`,
          status: 400,
        });
      }

      try {
        const data = await this.#createUploadTokens(metaList, tgName);
        return jsonOk({ data });
      } catch (e) {
        if (e instanceof BaseError) {
          return e.toResponse();
        }
        return new UnknownError(e).toResponse();
      }
    }

    if (operation) {
      logger.warn("not found", request.method, url.toString());
      return jsonError({ message: "not found", status: 404 });
    }

    if (request.method !== "POST") {
      logger.warn("Method not allowed", request.method);
      return jsonError({
        message: `method not allowed: ${request.method}`,
        status: 405,
      });
    }

    const token = url.searchParams.get("token");

    if (!token) {
      logger.warn("Missing upload token");
      return jsonError({ message: "missing token", status: 403 });
    }

    return await this.#handleUpload(token, request.body!, tgName);
  }

  #createUploadTokens(items: Array<ArtifactMeta>, tgName: string) {
    return Promise.all(
      items.map(async (meta) => {
        if (meta.typegraphName !== tgName) {
          throw new Error("Typegraph name mismatch");
        }
        return await this.store.prepareUpload(meta);
      }),
    );
  }

  async #handleUpload(
    token: string,
    stream: ReadableStream<Uint8Array>,
    tgName: string,
  ) {
    let meta: ArtifactMeta;
    try {
      meta = await this.store.takeArtifactMeta(token);
    } catch (err: any) {
      if (err instanceof BaseError) {
        return err.toResponse();
      }
      return jsonError({ message: err.message ?? err, status: 500 });
    }

    if (meta.typegraphName !== tgName) {
      throw new Error("Typegraph name mismatch");
    }

    // TODO key?
    const hash = await this.store.persistence.save(stream, meta.sizeInBytes);
    if (hash !== meta.hash) {
      await this.store.persistence.delete(hash);
      logger.warn("hash mismatch", hash, meta.hash);
      return jsonError({ message: "hash mismatch", status: 403 });
    }

    return jsonOk({ data: { status: "ok" }, status: 201 });
  }
}
