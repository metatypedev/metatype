// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { Runtime } from "./Runtime.ts";
import type { ComputeStage } from "../engine/query_engine.ts";
import type { RuntimeInitParams } from "../types.ts";
import {
  GetObjectCommand,
  type GetObjectCommandInput,
  ListObjectsCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
  type S3Client,
} from "aws-sdk/client-s3";
import { createS3ClientWithMD5 } from "../utils/mod.ts";
import { getSignedUrl } from "aws-sdk/s3-request-presigner";
import type {
  Materializer,
  S3Materializer,
  S3RuntimeData,
} from "../typegraph/types.ts";
import { registerRuntime } from "./mod.ts";
import { getLogger, type Logger } from "../log.ts";

const logger = getLogger(import.meta);

@registerRuntime("s3")
export class S3Runtime extends Runtime {
  private logger: Logger;

  private constructor(
    typegraphName: string,
    private client: S3Client,
  ) {
    super(typegraphName);
    this.logger = getLogger(`s3:'${typegraphName}'`);
  }

  static init(params: RuntimeInitParams): Runtime {
    logger.info("initializing S3Runtime");
    const { secretManager, typegraphName } = params;
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
    const client = createS3ClientWithMD5({
      ...clientInit,
    });
    return new S3Runtime(typegraphName, client);
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
            const commandParams = {
              Bucket: bucket as string,
              Prefix: path as string,
            };
            this.logger.info(`s3 list: ${JSON.stringify(commandParams)}`);
            const command = new ListObjectsCommand(commandParams);

            const res = await this.client.send(command);

            this.logger.info(`s3 list: successful`);
            this.logger.debug(`s3 list response: ${JSON.stringify(res)}`);

            return {
              keys: (res.Contents ?? []).map((c: any) => ({
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

            this.logger.info(`s3 presign_put: ${JSON.stringify(input)}`);
            const command = new PutObjectCommand(input);

            const res = await getSignedUrl(this.client, command, {
              expiresIn: expiry_secs ?? 60,
            });
            this.logger.info("s3 presign_put: successful");
            this.logger.debug(`s3 presign_put result: ${res}`);

            return res;
          });
        }

        case "presign_get": {
          const { bucket, expiry_secs } = mat.data;

          return stage.withResolver(async ({ path }) => {
            const input: GetObjectCommandInput = {
              Bucket: bucket,
              Key: path as string,
            };
            this.logger.info(`s3 presign_get: ${JSON.stringify(input)}`);
            const command = new GetObjectCommand(input);

            const res = await getSignedUrl(this.client, command, {
              expiresIn: expiry_secs ?? 3600,
            });
            this.logger.info("s3 presign_get: successful");
            this.logger.debug(`s3 presign_get result: ${res}`);

            return res;
          });
        }

        case "upload": {
          const { bucket } = mat.data;

          return stage.withResolver(async ({ path, file: f }) => {
            const file = f as File;
            // Get presigned URL using the presign_put materializer
            const input: PutObjectCommandInput = {
              Bucket: bucket,
              Key: path as string ?? file.name,
              ContentLength: file.size,
              ContentType: file.type,
            };
            this.logger.info(`s3 upload: getting presigned URL for ${JSON.stringify(input)}`);
            const command = new PutObjectCommand(input);
            const presignedUrl = await getSignedUrl(this.client, command, { expiresIn: 60 });
            
            // Upload using fetch
            this.logger.info(`s3 upload: uploading to presigned URL`);
            const response = await fetch(presignedUrl, {
              method: 'PUT',
              body: file,
              headers: {
                'Content-Type': file.type,
                'Content-Length': file.size.toString(),
              },
            });
            const body = await response.text();
            if (!response.ok) {
              throw new Error(`Failed to upload file: ${response.statusText}: ${body}`);
            }
            
            this.logger.info("s3 upload: successful");
            return true;
          });
        }

        case "upload_all": {
          const { bucket } = mat.data;

          this.logger.info(`s3 upload_all`);
          return stage.withResolver(async (args) => {
            const files = args.files as File[];
            const prefix = args.prefix as string;

            // Upload all files in parallel
            await Promise.all(files.map(async (file, i) => {
              const filePath = `${prefix}${file.name}`;
              // Get presigned URL for each file
              const input: PutObjectCommandInput = {
                Bucket: bucket,
                Key: filePath,
                ContentLength: file.size,
                ContentType: file.type,
              };
              this.logger.info(`s3 upload ${i}: getting presigned URL for ${JSON.stringify(input)}`);
              const command = new PutObjectCommand(input);
              const presignedUrl = await getSignedUrl(this.client, command, { expiresIn: 60 });
              
              // Upload using fetch
              this.logger.info(`s3 upload ${i}: uploading to presigned URL`);
              const response = await fetch(presignedUrl, {
                method: 'PUT',
                body: file,
                headers: {
                  'Content-Type': file.type,
                  'Content-Length': file.size.toString(),
                },
              });
              const body = await response.text();
              if (!response.ok) {
                throw new Error(`Failed to upload file ${file.name}: ${response.statusText}: ${body}`);
              }
              
              this.logger.info(`s3 upload ${i}: successful`);
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
