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

    def get(self, path: str, inp, out):
        return t.func(inp, out, RESTMat(self, "GET", path))

    def post(self, path: str, inp, out, **kwargs):
        return t.func(inp, out, RESTMat(self, "POST", path, **kwargs))

    def put(self, path: str, inp, out):
        return t.func(inp, out, RESTMat(self, "POST", path))


@dataclass(eq=True, frozen=True)
class RESTMat(Materializer):
    runtime: Runtime
    verb: str
    path: str
    content_type: str = "application/json"
    _: KW_ONLY
    materializer_name: str = "rest"
