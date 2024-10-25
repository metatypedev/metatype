import type { MaterializerId, RuntimeId } from "./core.d.ts";
import type { UInt } from "./primitives.d.ts";

type S3RuntimeData = {
  host_secret: string;
  region_secret: string;
  access_key_secret: string;
  secret_key_secret: string;
  path_style_secret: string;
};

type S3PresignGetParams = {
  bucket: string;
  expiry_secs?: UInt;
};

type S3PresignPutParams = {
  bucket: string;
  expiry_secs?: UInt;
  content_type?: string;
};

type register_s3_runtime = (data: S3RuntimeData) => RuntimeId;

type s3_presign_get = (
  runtime: RuntimeId,
  data: S3PresignGetParams,
) => MaterializerId;

type s3_presign_put = (
  runtime: RuntimeId,
  data: S3PresignPutParams,
) => MaterializerId;

type s3_list = (runtime: RuntimeId, bucket: string) => MaterializerId;

type s3_upload = (runtime: RuntimeId, bucket: string) => MaterializerId;

type s3_upload_all = (runtime: RuntimeId, bucket: string) => MaterializerId;

export type {
  S3RuntimeData,
  S3PresignGetParams,
  S3PresignPutParams,
  register_s3_runtime,
  s3_presign_get,
  s3_presign_put,
  s3_list,
  s3_upload,
  s3_upload_all,
};
