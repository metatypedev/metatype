# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Dict, Optional, Tuple

from attrs import field, frozen
from frozendict import frozendict

from typegraph import effects
from typegraph import types as t
from typegraph.effects import Effect
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.utils.attrs import always, required


@frozen
class HTTPRuntime(Runtime):
    """Runs HTTP requests.

    Example:
    ```python
    from typegraph.runtime.http import HTTPRuntime

    remote = HTTPRuntime('https://dev.to/api')
    remote.get(
        '/test',
        t.struct({}),
        t.array(t.struct({'a': t.integer()})),
    )
    ```
    """

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

    def get(self, path: str, inp, out, effect: Effect = effects.none(), **kwargs):
        return t.func(
            inp,
            out,
            RESTMat(self, "GET", path, effect=effect, **kwargs),
        )

    def post(self, path: str, inp, out, effect: Effect = effects.create(), **kwargs):
        return t.func(
            inp,
            out,
            RESTMat(self, "POST", path, effect=effect, **kwargs),
        )

    def put(self, path: str, inp, out, effect: Effect = effects.upsert(), **kwargs):
        return t.func(
            inp,
            out,
            RESTMat(self, "PUT", path, effect=effect, **kwargs),
        )

    def patch(self, path: str, inp, out, effect: Effect = effects.update(), **kwargs):
        return t.func(
            inp,
            out,
            RESTMat(self, "PATCH", path, effect=effect, **kwargs),
        )

    def delete(self, path: str, inp, out, effect: Effect = effects.delete(), **kwargs):
        return t.func(
            inp,
            out,
            RESTMat(self, "DELETE", path, effect=effect, **kwargs),
        )


@frozen
class RESTMat(Materializer):
    runtime: Runtime
    verb: str
    path: str

    content_type: str = field(kw_only=True, default="application/json")
    header_prefix: Optional[str] = "header#"
    query_fields: Optional[Tuple[str, ...]] = field(kw_only=True, default=None)
    rename_fields: Optional[Dict[str, str]] = field(
        converter=frozendict, default=frozendict({})
    )
    body_fields: Optional[Tuple[str, ...]] = field(kw_only=True, default=None)
    auth_token_field: Optional[str] = field(kw_only=True, default=None)
    materializer_name: str = always("rest")
    effect: Effect = required()
