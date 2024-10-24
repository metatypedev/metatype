# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Optional

from typegraph import t
from typegraph.gen.exports.aws import (
    S3PresignGetParams,
    S3PresignPutParams,
    S3RuntimeData,
)
from typegraph.gen.exports.runtimes import EffectCreate, EffectRead
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import aws, ErrorStack, store


class S3Runtime(Runtime):
    host_secret: str
    region_secret: str
    access_key_secret: str
    secret_key_secret: str
    path_style_secret: str

    def __init__(
        self,
        host_secret: str,
        region_secret: str,
        access_key_secret: str,
        secret_key_secret: str,
        path_style_secret: str,
    ):
        runtime_id = aws.register_s3_runtime(
            store,
            S3RuntimeData(
                host_secret=host_secret,
                region_secret=region_secret,
                access_key_secret=access_key_secret,
                secret_key_secret=secret_key_secret,
                path_style_secret=path_style_secret,
            ),
        )
        if isinstance(runtime_id, Err):
            raise ErrorStack(runtime_id.value)

        super().__init__(runtime_id.value)
        self.host_secret = host_secret
        self.region_secret = region_secret
        self.access_key_secret = access_key_secret
        self.secret_key_secret = secret_key_secret
        self.path_style_secret = path_style_secret

    def presign_get(self, bucket: str, expiry_secs: Optional[int] = None):
        mat_id = aws.s3_presign_get(
            store,
            self.id,
            S3PresignGetParams(
                bucket=bucket,
                expiry_secs=expiry_secs,
            ),
        )
        if isinstance(mat_id, Err):
            raise ErrorStack(mat_id.value)

        return t.func(
            t.struct({"path": t.string()}),
            t.uri(),
            PresignGetMat(
                mat_id.value,
                bucket=bucket,
                expiry_secs=expiry_secs,
                effect=EffectRead(),
            ),
        )

    def presign_put(
        self,
        bucket: str,
        content_type: Optional[str] = None,
        expiry_secs: Optional[int] = None,
    ):
        mat_id = aws.s3_presign_put(
            store,
            self.id,
            S3PresignPutParams(
                bucket=bucket,
                content_type=content_type,
                expiry_secs=expiry_secs,
            ),
        )
        if isinstance(mat_id, Err):
            raise ErrorStack(mat_id.value)

        return t.func(
            t.struct({"length": t.integer(), "path": t.string()}),
            t.uri(),
            PresignPutMat(
                mat_id.value,
                bucket=bucket,
                content_type=content_type,
                expiry_secs=expiry_secs,
                effect=EffectRead(),
            ),
        )

    def list(self, bucket: str):
        mat_id = aws.s3_list(store, self.id, bucket)
        if isinstance(mat_id, Err):
            raise ErrorStack(mat_id.value)

        return t.func(
            t.struct({"path": t.string().optional()}),
            t.struct(
                {
                    "keys": t.list(t.struct({"key": t.string(), "size": t.integer()})),
                    "prefix": t.list(t.string()),
                }
            ),
            S3ListMat(mat_id.value, bucket=bucket, effect=EffectRead()),
        )

    def upload(self, bucket: str, file_type: Optional[t.file] = None):
        mat_id = aws.s3_upload(store, self.id, bucket)
        if isinstance(mat_id, Err):
            raise ErrorStack(mat_id.value)

        if file_type is None:
            file_type = t.file()
        return t.func(
            t.struct(
                {
                    "file": file_type,
                    "path": t.string().optional(),
                }
            ),
            t.boolean(),
            S3UploadMat(mat_id.value, bucket=bucket, effect=EffectCreate(True)),
        )

    def upload_all(self, bucket: str, file_type: Optional[t.file] = None):
        mat_id = aws.s3_upload_all(store, self.id, bucket)
        if isinstance(mat_id, Err):
            raise ErrorStack(mat_id.value)

        if file_type is None:
            file_type = t.file()
        return t.func(
            t.struct(
                {
                    "prefix": t.string().optional(""),
                    "files": t.list(file_type),
                }
            ),
            t.boolean(),
            S3UploadAllMat(mat_id.value, bucket=bucket, effect=EffectCreate(True)),
        )


@dataclass
class PresignGetMat(Materializer):
    bucket: str
    expiry_secs: Optional[int]


@dataclass
class PresignPutMat(Materializer):
    bucket: str
    content_type: str
    expiry_secs: Optional[int]


@dataclass
class S3ListMat(Materializer):
    bucket: str


@dataclass
class S3UploadMat(Materializer):
    bucket: str


@dataclass
class S3UploadAllMat(Materializer):
    bucket: str
