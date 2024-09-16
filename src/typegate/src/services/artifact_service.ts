// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  type ArtifactMeta,
  artifactMetaSchema,
  type ArtifactStore,
} from "../typegate/artifacts/mod.ts";
import { z } from "zod";
import { getLogger } from "../log.ts";
import { BaseError, UnknownError } from "../errors.ts";

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
        logger.warn("Method not allowed: {}", request.method);
        return new Response(JSON.stringify({ error: "method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }

      let metaList: Array<ArtifactMeta>;
      try {
        metaList = prepareUploadBodySchema.parse(await request.json());
      } catch (error) {
        logger.error("Failed to parse data: {}", error);
        return new Response(
          JSON.stringify({ error: `Invalid Request Body: ${error.message}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      try {
        const data = await this.#createUploadTokens(metaList, tgName);
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        if (e instanceof BaseError) {
          return e.toResponse();
        }
        return new UnknownError(e).toResponse();
      }
    }

    if (operation) {
      logger.warn("not found: {} {}", request.method, url.toString());
      return new Response(JSON.stringify({ message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST") {
      logger.warn("Method not allowed: {}", request.method);
      return new Response(JSON.stringify({ error: "method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = url.searchParams.get("token");

    if (!token) {
      logger.warn("Missing upload token");
      return new Response(JSON.stringify({ error: "missing token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
    } catch (e) {
      if (e instanceof BaseError) {
        return e.toResponse();
      }
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (meta.typegraphName !== tgName) {
      throw new Error("Typegraph name mismatch");
    }

    // TODO key?
    const hash = await this.store.persistence.save(stream, meta.sizeInBytes);
    if (hash !== meta.hash) {
      await this.store.persistence.delete(hash);
      logger.warn("hash mismatch: {} {}", hash, meta.hash);
      return new Response(JSON.stringify({ error: "hash mismatch" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ status: "ok" }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
