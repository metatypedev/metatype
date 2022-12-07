# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional
from typing import Tuple

from attrs import field
from attrs import frozen
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import types as t
from typegraph.utils.attrs import always


@frozen
class HTTPRuntime(Runtime):
    endpoint: str
    cert_secret: Optional[str] = None
    basic_auth_secret: Optional[str] = None
    runtime_name: str = always("http")

    def data(self, collector):
        return {
            **super().data(collector),
            "cert_secret": self.cert_secret,
            "basic_auth_secret": self.basic_auth_secret,
        }

    def get(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "GET", path, **kwargs, serial=False))

    def post(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "POST", path, **kwargs, serial=True))

    def put(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "PUT", path, **kwargs, serial=True))

    def patch(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "PATCH", path, **kwargs, serial=True))

    def delete(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "DELETE", path, **kwargs, serial=True))


@frozen
class RESTMat(Materializer):
    runtime: Runtime
    verb: str
    path: str

    content_type: str = field(kw_only=True, default="application/json")
    header_prefix: Optional[str] = "header#"
    query_fields: Optional[Tuple[str, ...]] = field(kw_only=True, default=None)
    body_fields: Optional[Tuple[str, ...]] = field(kw_only=True, default=None)
    auth_token_field: Optional[str] = field(kw_only=True, default=None)
    materializer_name: str = always("rest")
    serial: bool = field(kw_only=True)
