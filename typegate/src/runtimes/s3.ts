// Copyright Metatype OÜ, licensed under the Elastic License 2.0.
// SPDX-License-Identifier: Elastic-2.0

import { Runtime } from "./Runtime.ts";
import { ComputeStage } from "../engine.ts";
import { RuntimeInitParams } from "../types.ts";
// import { iterParentStages, JSONValue } from "../utils.ts";
import {
  GetObjectCommand,
  GetObjectCommandInput,
  ListObjectsCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from "aws-sdk/client-s3";
import { getSignedUrl } from "aws-sdk/s3-request-presigner";
import {
  Materializer,
  S3Materializer,
  S3RuntimeData,
} from "../types/typegraph.ts";
import { Typegate } from "../typegate/mod.ts";

export class S3Runtime extends Runtime {
  private constructor(
    private client: S3Client,
  ) {
    super();
  }

  static init(params: RuntimeInitParams): Runtime {
    const { secretManager } = params;
    const args = params.args as unknown as S3RuntimeData;

    const {
      host_secret,
      region_secret,
      path_style_secret,
      access_key_secret,
      secret_key_secret,
    } = args;
    const credentials = {
      accessKeyId: secretManager.secretOrFail(access_key_secret),
      secretAccessKey: secretManager.secretOrFail(secret_key_secret),
    };
    const clientInit = {
      endpoint: secretManager.secretOrFail(host_secret),
      region: secretManager.secretOrFail(region_secret),
      credentials,
      forcePathStyle: secretManager.secretOrNull(path_style_secret) === "true",
    };
    const client = new S3Client(clientInit);
    return new S3Runtime(client);
  }

  async deinit(): Promise<void> {}

  materialize(
    stage: ComputeStage,
    waitlist: ComputeStage[],
    _verbose: boolean,
  ): ComputeStage[] {
    const sameRuntime = Runtime.collectRelativeStages(stage, waitlist);

    return [stage, ...sameRuntime].map((stage) => {
      const mat = stage.props.materializer as unknown as S3Materializer;
      if (mat == null) {
        return stage.withResolver(Runtime.resolveFromParent(stage.props.node));
      }

      switch (mat.name) {
        case "list": {
          const { bucket } = mat.data;
          return stage.withResolver(async ({ path }) => {
            const command = new ListObjectsCommand({
              Bucket: bucket as string,
              Prefix: path as string,
            });
            const res = await this.client.send(command);
            return {
              keys: (res.Contents ?? []).map((c) => ({
                key: c.Key,
                size: c.Size,
              })),
              prefix: res.Prefix != null ? [res.Prefix] : [],
            };
          });
        }

        case "presign_put": {
          const { bucket, content_type, expiry_secs } = mat.data;

          return stage.withResolver(async ({ length, path }) => {
            const input: PutObjectCommandInput = {
              Bucket: bucket,
              Key: path as string,
              ContentLength: length,
            };
            if (content_type != null) {
              input.ContentType = content_type;
            }
            const command = new PutObjectCommand(input);

            return await getSignedUrl(this.client, command, {
              expiresIn: expiry_secs ?? 60,
            });
          });
        }

        case "presign_get": {
          const { bucket, expiry_secs } = mat.data;

          return stage.withResolver(async ({ path }) => {
            const input: GetObjectCommandInput = {
              Bucket: bucket,
              Key: path as string,
            };
            const command = new GetObjectCommand(input);

            return await getSignedUrl(this.client, command, {
              expiresIn: expiry_secs ?? 3600,
            });
          });
        }

        case "upload": {
          const { bucket } = mat.data;

          return stage.withResolver(async ({ path, file: f }) => {
            const file = f as File;
            const command = new PutObjectCommand({
              Bucket: bucket as string,
              Key: path as string ?? file.name,
              ContentType: file.type,
              ContentLength: file.size,
              Body: file,
            });

            await this.client.send(command);
            return true;
          });
        }

        case "upload_all": {
          const { bucket } = mat.data;

          return stage.withResolver(async (args) => {
            const files = args.files as File[];
            const prefix = args.prefix as string;

            // TODO: collect errors
            await Promise.all(files.map((file) => {
              const command = new PutObjectCommand({
                Bucket: bucket as string,
                Key: `${prefix}${file.name}`,
                ContentType: file.type,
                ContentLength: file.size,
                Body: file,
              });
              return this.client.send(command);
            }));

            return true;
          });
        }

        default:
          throw new Error(
            `Unknown materializer: ${
              JSON.stringify((mat as Materializer).name)
            }`,
          );
      }
    });
  }
}

Typegate.registerRuntime("s3", S3Runtime.init);
