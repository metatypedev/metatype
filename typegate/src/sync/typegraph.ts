// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { SecretManager, TypeGraph, TypeGraphDS } from "../typegraph/mod.ts";
import {
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "aws-sdk/client-s3";
import { SyncConfig } from "../config.ts";
import { TypegateCryptoKeys } from "../crypto.ts";

import { encodeHex } from "@std/encoding";
import { z } from "zod";

export const typegraphIdSchema = z.object({
  name: z.string(),
  hash: z.string(),
  uploadedAt: z.coerce.date(),
});

export type TypegraphId = z.infer<typeof typegraphIdSchema>;

export class TypegraphStore {
  static init(syncConfig: SyncConfig, cryptoKeys: TypegateCryptoKeys) {
    const clientInit = syncConfig.s3;
    const bucket = syncConfig.s3Bucket;
    const client = new S3Client(clientInit);
    return new TypegraphStore(client, bucket, cryptoKeys);
  }

  private constructor(
    private s3client: S3Client,
    private bucket: string,
    private cryptoKeys: TypegateCryptoKeys,
  ) {}

  public async upload(
    typegraph: TypeGraphDS,
    secretManager: SecretManager,
  ): Promise<TypegraphId> {
    const encryptedSecrets = await this.cryptoKeys.encrypt(
      JSON.stringify(secretManager.secrets),
    );
    const data = JSON.stringify([typegraph, encryptedSecrets]);
    const hash = encodeHex(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)),
    );

    const id = {
      name: TypeGraph.formatName(typegraph),
      hash,
      uploadedAt: new Date(),
    };

    await this.#uploadData(this.bucket, TypegraphStore.#getKey(id), data);

    return id;
  }

  public async download(
    id: TypegraphId,
  ): Promise<[TypeGraphDS, SecretManager]> {
    const key = TypegraphStore.#getKey(id);
    const data = await this.#downloadData(this.bucket, key);
    const [typegraph, encryptedSecrets] = JSON.parse(data) as [
      TypeGraphDS,
      string,
    ];
    const secrets = JSON.parse(await this.cryptoKeys.decrypt(encryptedSecrets));
    const secretManager = new SecretManager(typegraph, secrets);

    return [typegraph, secretManager];
  }

  static #getKey(typegraphId: TypegraphId) {
    const { name, hash, uploadedAt } = typegraphId;
    const uploadDate = uploadedAt.toISOString();
    return `typegraphs/${name}/typegraph.json.${uploadDate}.${hash}`;
  }

  async #uploadData(bucket: string, key: string, data: string) {
    const input: PutObjectCommandInput = {
      Bucket: bucket,
      Key: key,
      Body: data,
    };
    const command = new PutObjectCommand(input);

    await this.s3client.send(command);
  }

  async #downloadData(bucket: string, key: string): Promise<string> {
    const response = await this.s3client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error("Response body is empty");
    }
    const body = await response.Body.transformToString();
    return body;
  }
}
