# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from attrs import frozen

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

    host: str
    region: str
    access_key_secret: str
    secret_key_secret: str
    runtime_name: str = always("s3")

    def data(self, collector):
        data = super().data(collector)
        data["data"].update(
            host=self.host,
            region=self.region,
            access_key_secret=self.access_key_secret,
            secret_key_secret=self.secret_key_secret,
        )
        return data

    def sign(self, bucket: str, content_type: str):
        return t.func(
            t.struct({"length": t.integer(), "path": t.string()}),
            t.string(),
            SignMat(self, bucket, content_type),
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
            t.struct({"file": file_type, "path": t.string()}),
            t.string(),
            UploadMat(self, bucket),
        )

    def download_url(self, bucket: str, expiry_secs: Optional[int] = 3600):
        return t.func(
            t.struct({"path": t.string()}),
            t.uri(),
            DownloadUrlMat(self, bucket, expiry_secs),
        )


@frozen
class SignMat(Materializer):
    runtime: Runtime
    bucket: str
    content_type: str
    materializer_name: str = always("sign")
    effect: Effect = always(effects.none())


@frozen
class ListMat(Materializer):
    runtime: Runtime
    bucket: str
    materializer_name: str = always("list")
    effect: Effect = always(effects.none())


@frozen
class UploadMat(Materializer):
    runtime: S3Runtime
    bucket: str
    materializer_name: str = always("upload")
    effect: Effect = always(effects.upsert())


@frozen
class DownloadUrlMat(Materializer):
    runtime: S3Runtime
    bucket: str
    expiry_secs: int
    materializer_name: str = always("download_url")
    effect: Effect = always(effects.none())
