# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Dict, List, Optional


from typing_extensions import TypedDict
from typegraph import fx, t
from typegraph.gen.runtimes import (
    BaseMaterializer,
    Effect,
    HttpMethod,
    HttpRuntimeData,
    MaterializerHttpRequest,
)
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.sdk import runtimes


class HttpRequestKwargs(TypedDict):
    content_type: Optional[str]
    header_prefix: Optional[str]
    query_fields: Optional[List[str]]
    rename_fields: Optional[Dict[str, str]]
    body_fields: Optional[List[str]]
    auth_token_field: Optional[str]


@dataclass
class HttpRequestOptions:
    content_type: Optional[str] = None
    header_prefix: Optional[str] = None
    query_fields: Optional[List[str]] = None
    rename_fields: Optional[Dict[str, str]] = None
    body_fields: Optional[List[str]] = None
    auth_token_field: Optional[str] = None

    def from_kwargs(**kwargs: HttpRequestKwargs):
        return HttpRequestOptions(
            content_type=kwargs.get("content_type", None),
            header_prefix=kwargs.get("header_prefix", None),
            query_fields=kwargs.get("query_fields", None),
            rename_fields=kwargs.get("rename_fields", None),
            body_fields=kwargs.get("body_fields", None),
            auth_token_field=kwargs.get("auth_token_field", None),
        )


@dataclass
class HttpRequestMat(Materializer):
    method: HttpMethod
    path: str
    options: HttpRequestOptions


class HttpRuntime(Runtime):
    endpoint: str
    cert_secret: Optional[str]
    basic_auth_secret: Optional[str]

    def __init__(
        self,
        endpoint: str,
        cert_secret: Optional[str] = None,
        basic_auth_secret: Optional[str] = None,
    ):
        runtime_id = runtimes.register_http_runtime(
            HttpRuntimeData(endpoint, cert_secret, basic_auth_secret)
        )
        super().__init__(runtime_id)
        self.endpoint = endpoint
        self.cert_secret = cert_secret
        self.basic_auth_secret = basic_auth_secret

    def __request(
        self,
        method: HttpMethod,
        path: str,
        inp: "t.struct",
        out: "t.typedef",
        effect: Effect,
        opts: HttpRequestOptions,
    ):
        mat_id = runtimes.http_request(
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerHttpRequest(
                method,
                path,
                content_type=opts.content_type,
                header_prefix=opts.header_prefix,
                query_fields=opts.query_fields,
                rename_fields=(
                    list(opts.rename_fields.items()) if opts.rename_fields else None
                ),
                body_fields=opts.body_fields,
                auth_token_field=opts.auth_token_field,
            ),
        )

        return t.func(
            inp,
            out,
            HttpRequestMat(
                mat_id,
                method=method,
                effect=effect,
                path=path,
                options=opts,
            ),
        )

    def get(
        self,
        path,
        inp: "t.struct",
        out: "t.typedef",
        **kwargs: HttpRequestKwargs,
    ):
        return self.__request(
            "get",
            path,
            inp,
            out,
            fx.read(),
            HttpRequestOptions.from_kwargs(**kwargs),
        )

    def post(
        self,
        path: str,
        inp: "t.struct",
        out: "t.typedef",
        *,
        effect: Effect = fx.create(),
        **kwargs: HttpRequestKwargs,
    ):
        return self.__request(
            "post",
            path,
            inp,
            out,
            effect,
            HttpRequestOptions.from_kwargs(**kwargs),
        )

    def put(
        self,
        path: str,
        inp: "t.struct",
        out: "t.typedef",
        *,
        effect: Effect = fx.update(),
        **kwargs: HttpRequestKwargs,
    ):
        return self.__request(
            "put",
            path,
            inp,
            out,
            effect,
            HttpRequestOptions.from_kwargs(**kwargs),
        )

    def patch(
        self,
        path: str,
        inp: "t.struct",
        out: "t.typedef",
        *,
        effect: Effect = fx.update(),
        **kwargs: HttpRequestKwargs,
    ):
        return self.__request(
            "patch",
            path,
            inp,
            out,
            effect,
            HttpRequestOptions.from_kwargs(**kwargs),
        )

    def delete(
        self,
        path: str,
        inp: "t.struct",
        out: "t.typedef",
        *,
        effect: Effect = fx.delete(),
        **kwargs: HttpRequestKwargs,
    ):
        return self.__request(
            "delete",
            path,
            inp,
            out,
            effect,
            HttpRequestOptions.from_kwargs(**kwargs),
        )
