// Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
// SPDX-License-Identifier: MPL-2.0

import { type Materializer, Runtime } from "../runtimes/mod.ts";
import { aws } from "../sdk.ts";
import type {
  S3PresignGetParams,
  S3PresignPutParams,
  S3RuntimeData,
} from "../gen/aws.ts";
import { t } from "../index.ts";

type S3PresignGetMat = Materializer & S3PresignGetParams;
type S3PresignPutMat = Materializer & S3PresignPutParams;
type S3ListMat = Materializer & { bucket: string };
type S3UploadMat = Materializer & { bucket: string };
type S3UploadAllMat = Materializer & { bucket: string };

export class S3Runtime extends Runtime {
  hostSecret: string;
  regionSecret: string;
  accessKeySecret: string;
  secretKeySecret: string;
  pathStyleSecret: string;

  constructor(options: S3RuntimeData) {
    const id = aws.registerS3Runtime(options);
    super(id);
    this.hostSecret = options.hostSecret;
    this.regionSecret = options.regionSecret;
    this.accessKeySecret = options.accessKeySecret;
    this.secretKeySecret = options.secretKeySecret;
    this.pathStyleSecret = options.pathStyleSecret;
  }

  /** create a function to presign an S3 GetObject request */
  public presignGet(params: S3PresignGetParams): t.Func {
    const { bucket, expirySecs } = params;
    const mat: S3PresignGetMat = {
      _id: aws.s3PresignGet(this._id, params),
      bucket,
      expirySecs,
    };
    return t.func(t.struct({ path: t.string() }), t.uri(), mat);
  }

  /** create a function to presign an S3 PutObject request */
  public presignPut(params: S3PresignPutParams): t.Func {
    const { bucket, expirySecs, contentType } = params;
    const mat: S3PresignPutMat = {
      _id: aws.s3PresignPut(this._id, params),
      bucket,
      expirySecs,
      contentType,
    };
    return t.func(
      t.struct({ length: t.integer(), path: t.string() }),
      t.uri(),
      mat,
    );
  }

  /**
   * create a function to list objects in a bucket
   */
  public list(bucket: string): t.Func {
    const mat: S3ListMat = {
      _id: aws.s3List(this._id, bucket),
      bucket,
    };
    return t.func(
      t.struct({ path: t.string().optional() }),
      t.struct({
        keys: t.list(t.struct({ key: t.string(), size: t.integer() })),
        prefix: t.list(t.string()),
      }),
      mat,
    );
  }

  /** create a function for a file upload */
  public upload(bucket: string, overrideFileType?: t.Typedef): t.Func {
    const fileType = overrideFileType ?? t.file();
    const mat: S3UploadMat = {
      _id: aws.s3Upload(this._id, bucket),
      bucket,
    };
    return t.func(
      t.struct({ file: fileType, path: t.string().optional() }),
      t.boolean(),
      mat,
    );
  }

  /** create a function for multiple file uploads */
  public uploadAll(bucket: string, overrideFileType?: t.Typedef): t.Func {
    const fileType = overrideFileType ?? t.file();
    const mat: S3UploadAllMat = {
      _id: aws.s3UploadAll(this._id, bucket),
      bucket,
    };
    return t.func(
      t.struct({
        prefix: t.string().optional({ defaultItem: "" }),
        files: t.list(fileType),
      }),
      t.boolean(),
      mat,
    );
  }
}
