# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import KW_ONLY

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t


@dataclass(eq=True, frozen=True)
class S3Runtime(Runtime):
    host: str
    region: str
    access_key_secret: str
    secret_key_secret: str
    _: KW_ONLY
    runtime_name: str = "s3"

    @property
    def data(self):
        return {
            **super().data,
            "host": self.host,
            "region": self.region,
            "access_key_secret": self.access_key_secret,
            "secret_key_secret": self.secret_key_secret,
        }

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
                    "keys": t.list(t.struct({"key": t.string(), "size": t.integer()})),
                    "prefix": t.list(t.string()),
                }
            ),
            ListMat(self, bucket),
        )


@dataclass(eq=True, frozen=True)
class SignMat(Materializer):
    runtime: Runtime
    bucket: str
    content_type: str
    _: KW_ONLY
    materializer_name: str = "sign"


@dataclass(eq=True, frozen=True)
class ListMat(Materializer):
    runtime: Runtime
    bucket: str
    _: KW_ONLY
    materializer_name: str = "list"
