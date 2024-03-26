// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import {
  artifactMetaSchema,
  ArtifactStore,
} from "../typegate/artifacts/mod.ts";
import { z } from "zod";

const getUploadUrlBodySchema = z.array(artifactMetaSchema);

export class ArtifactService {
  constructor(private store: ArtifactStore) {}

  async handle(request: Request, tgName: string) {
    const url = new URL(request.url);
    // [1] is the typegraph name; [2] is the service name
    const operation = url.pathname.split("/")[3];

    if (operation === "upload-urls") {
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405 });
      }

      const metaList = getUploadUrlBodySchema.parse(await request.json());
      try {
        const data = await this.#createUploadUrls(
          metaList,
          tgName,
          new URL(request.url).origin,
        );
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(`forbidden: ${e.message}`, { status: 403 });
      }
    }

    if (operation) {
      return new Response("not found", { status: 404 });
    }

    if (request.method !== "POST") {
      return new Response("method not allowed", { status: 405 });
    }

    return this.#handleUpload(url, request.body!, tgName);
  }

  #createUploadUrls(
    items: Array<z.infer<typeof artifactMetaSchema>>,
    tgName: string,
    origin: string,
  ) {
    return Promise.all(items.map(async (meta) => {
      if (meta.typegraphName !== tgName) {
        throw new Error("Typegraph name mismatch");
      }
      return await this.store.prepareUpload(meta, new URL(origin));
    }));
  }

  async #handleUpload(
    url: URL,
    stream: ReadableStream<Uint8Array>,
    tgName: string,
  ) {
    let meta;
    try {
      meta = await this.store.takeUploadUrl(url);
    } catch (e) {
      return new Response(e.message, { status: 403 });
    }

    if (meta.typegraphName !== tgName) {
      throw new Error("Typegraph name mismatch");
    }

    // TODO key?
    const hash = await this.store.persist(stream);
    if (hash !== meta.hash) {
      await this.store.delete(hash);
      return new Response("hash mismatch", { status: 403 });
    }

    return new Response("ok", { status: 201 });
  }
}
