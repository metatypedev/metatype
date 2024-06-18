export namespace MetatypeTypegraphAws {
  export function registerS3Runtime(data: S3RuntimeData): RuntimeId;
  export function s3PresignGet(runtime: RuntimeId, data: S3PresignGetParams): MaterializerId;
  export function s3PresignPut(runtime: RuntimeId, data: S3PresignPutParams): MaterializerId;
  export function s3List(runtime: RuntimeId, bucket: string): MaterializerId;
  export function s3Upload(runtime: RuntimeId, bucket: string): MaterializerId;
  export function s3UploadAll(runtime: RuntimeId, bucket: string): MaterializerId;
}
import type { Error } from './metatype-typegraph-core.js';
export { Error };
import type { RuntimeId } from './metatype-typegraph-core.js';
export { RuntimeId };
import type { MaterializerId } from './metatype-typegraph-core.js';
export { MaterializerId };
export interface S3RuntimeData {
  hostSecret: string,
  regionSecret: string,
  accessKeySecret: string,
  secretKeySecret: string,
  pathStyleSecret: string,
}
export interface S3PresignGetParams {
  bucket: string,
  expirySecs?: number,
}
export interface S3PresignPutParams {
  bucket: string,
  expirySecs?: number,
  contentType?: string,
}
