# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from attrs import frozen

from typegraph import effects, t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always


@frozen
class S3Runtime(Runtime):
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
