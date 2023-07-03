# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from attrs import frozen, field

from typegraph import effects, t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always
from typing import Optional


@frozen
class S3Runtime(Runtime):
    """
    [Documentation](https://metatype.dev/docs/reference/runtimes/s3)
    """

    host_secret: str
    region_secret: str
    access_key_secret: str
    secret_key_secret: str
    path_style_secret: Optional[str] = field(default=None, kw_only=True)
    runtime_name: str = field(default="s3", init=False)

    def data(self, collector):
        data = super().data(collector)
        return data

    def presign_get(self, bucket: str, expiry_secs: Optional[int] = None):
        return t.func(
            t.struct({"path": t.string()}),
            t.uri(),
            PresignGetMat(self, bucket, expiry_secs),
        )

    def presign_put(
        self,
        bucket: str,
        content_type: Optional[str] = None,
        expiry_secs: Optional[int] = None,
    ):
        return t.func(
            t.struct({"length": t.integer(), "path": t.string()}),
            t.uri(),
            PresignPutMat(self, bucket, content_type, expiry_secs),
        )

    def list(self, bucket: str):
        return t.func(
            t.struct({"path": t.string()}),
            t.struct(
                {
                    "keys": t.array(t.struct({"key": t.string(), "size": t.integer()})),
                    "prefix": t.array(t.string()),
                }
            ),
            ListMat(self, bucket),
        )

    def upload(self, bucket: str, file_type: Optional[t.file] = None):
        if file_type is None:
            file_type = t.file()
        return t.func(
            t.struct({"file": file_type, "path": t.string().optional()}),
            t.boolean(),  # True
            UploadMat(self, bucket),
        )

    def upload_all(self, bucket: str, file_type: Optional[t.file] = None):
        if file_type is None:
            file_type = t.file()
        return t.func(
            t.struct(
                {
                    "prefix": t.string().optional(""),
                    # s3 key will be `prefix + file.name`
                    "files": t.array(file_type),
                }
            ),
            t.boolean(),  # True
            UploadAllMat(self, bucket),
        )


@frozen
class PresignGetMat(Materializer):
    runtime: S3Runtime
    bucket: str
    expiry_secs: Optional[int]
    materializer_name: str = always("presign_get")
    effect: Effect = always(effects.none())


@frozen
class PresignPutMat(Materializer):
    runtime: S3Runtime
    bucket: str
    content_type: Optional[str]
    expiry_secs: Optional[int]
    materializer_name: str = always("presign_put")
    effect: Effect = always(effects.none())


@frozen
class ListMat(Materializer):
    runtime: S3Runtime
    bucket: str
    materializer_name: str = always("list")
    effect: Effect = always(effects.none())


@frozen
class UploadMat(Materializer):
    runtime: S3Runtime
    bucket: str
    materializer_name: str = always("upload")
    effect: Effect = always(effects.update(True))


@frozen
class UploadAllMat(Materializer):
    runtime: S3Runtime
    bucket: str
    materializer_name: str = always("upload_all")
    effect: Effect = always(effects.update(True))
