# Copyright Metatype OÜ under the Elastic License 2.0 (ELv2). See LICENSE.md for usage.

from typing import Optional
from typing import Tuple

from attrs import field
from attrs import frozen
from typegraph import types as t
from typegraph.runtimes.base import Effect
from typegraph.runtimes.base import Materializer
from typegraph.runtimes.base import Runtime
from typegraph.utils.attrs import always
from typegraph.utils.attrs import required


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

    def get(
        self,
        path: str,
        inp,
        out,
        effect: Optional[Effect] = None,
        idempotent: bool = True,
        **kwargs
    ):
        return t.func(
            inp,
            out,
            RESTMat(self, "GET", path, effect=effect, idempotent=idempotent, **kwargs),
        )

    def post(
        self,
        path: str,
        inp,
        out,
        effect: Optional[Effect] = Effect.CREATE,
        idempotent: bool = False,
        **kwargs
    ):
        return t.func(
            inp,
            out,
            RESTMat(self, "POST", path, effect=effect, idempotent=idempotent, **kwargs),
        )

    def put(
        self,
        path: str,
        inp,
        out,
        effect: Optional[Effect] = Effect.UPSERT,
        idempotent: bool = True,
        **kwargs
    ):
        return t.func(
            inp,
            out,
            RESTMat(self, "PUT", path, effect=effect, idempotent=idempotent, **kwargs),
        )

    def patch(
        self,
        path: str,
        inp,
        out,
        effect: Optional[Effect] = Effect.UPDATE,
        idempotent: bool = False,
        **kwargs
    ):
        return t.func(
            inp,
            out,
            RESTMat(
                self, "PATCH", path, effect=effect, idempotent=idempotent, **kwargs
            ),
        )

    def delete(
        self,
        path: str,
        inp,
        out,
        effect: Optional[Effect] = Effect.DELETE,
        idempotent: bool = True,
        **kwargs
    ):
        return t.func(
            inp,
            out,
            RESTMat(
                self, "DELETE", path, effect=effect, idempotent=idempotent, **kwargs
            ),
        )


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
    effect: Optional[Effect] = required()
    idempotent: bool = required()
