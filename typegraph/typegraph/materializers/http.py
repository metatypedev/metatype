# Copyright Metatype under the Elastic License 2.0.

from dataclasses import dataclass
from dataclasses import KW_ONLY

from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t


@dataclass(eq=True, frozen=True)
class HTTPRuntime(Runtime):
    endpoint: str
    _: KW_ONLY
    runtime_name: str = "http"

    def get(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "GET", path, **kwargs))

    def post(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "POST", path, **kwargs))

    def put(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "PUT", path, **kwargs))

    def patch(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "PATCH", path, **kwargs))

    def delete(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "DELETE", path, **kwargs))


@dataclass(eq=True, frozen=True)
class RESTMat(Materializer):
    runtime: Runtime
    verb: str
    path: str
    _: KW_ONLY
    content_type: str = "application/json"
    query_fields: tuple[str, ...] | None = None
    body_fields: tuple[str, ...] | None = None
    auth_token_field: str | None = None
    materializer_name: str = "rest"
