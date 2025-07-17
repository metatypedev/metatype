// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { rpcRequest } from "./client.ts";
import type { MaterializerId, RuntimeId } from "./core.ts";

export type S3RuntimeData = {
  hostSecret: string
  regionSecret: string
  accessKeySecret: string
  secretKeySecret: string
  pathStyleSecret: string
}

export type S3PresignGetParams = {
  bucket: string
  expirySecs?: number
}

export type S3PresignPutParams = {
  bucket: string
  expirySecs?: number
  contentType?: string
}

export function registerS3Runtime(data: S3RuntimeData): RuntimeId {
  return rpcRequest("register_s3_runtime", { data });
}

export function s3PresignGet(runtime: RuntimeId, data: S3PresignGetParams): MaterializerId {
  return rpcRequest("s3_presign_get", { runtime, data });
}

export function s3PresignPut(runtime: RuntimeId, data: S3PresignPutParams): MaterializerId {
  return rpcRequest("s3_presign_put", { runtime, data });
}

export function s3List(runtime: RuntimeId, bucket: string): MaterializerId {
  return rpcRequest("s3_list", { runtime, bucket });
}

export function s3Upload(runtime: RuntimeId, bucket: string): MaterializerId {
  return rpcRequest("s3_upload", { runtime, bucket });
}

export function s3UploadAll(runtime: RuntimeId, bucket: string): MaterializerId {
  return rpcRequest("s3_upload_all", { runtime, bucket });
}