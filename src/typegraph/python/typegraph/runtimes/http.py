# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Dict, List, Optional

from typing_extensions import TypedDict

from typegraph import fx, t
from typegraph.gen.exports.runtimes import (
    BaseMaterializer,
    Effect,
    HttpMethod,
    HttpRuntimeData,
    MaterializerHttpRequest,
)
from typegraph.gen.types import Err
from typegraph.runtimes.base import Materializer, Runtime
from typegraph.wit import runtimes, store


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
            store, HttpRuntimeData(endpoint, cert_secret, basic_auth_secret)
        )
        if isinstance(runtime_id, Err):
            raise Exception(runtime_id.value)

        super().__init__(runtime_id.value)
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
            store,
            BaseMaterializer(runtime=self.id, effect=effect),
            MaterializerHttpRequest(
                method,
                path,
                content_type=opts.content_type,
                header_prefix=opts.header_prefix,
                query_fields=opts.query_fields,
                rename_fields=list(opts.rename_fields.items())
                if opts.rename_fields
                else None,
                body_fields=opts.body_fields,
                auth_token_field=opts.auth_token_field,
            ),
        )

        if isinstance(mat_id, Err):
            raise Exception(mat_id.value)

        return t.func(
            inp,
            out,
            HttpRequestMat(
                mat_id.value,
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
            HttpMethod.GET,
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
            HttpMethod.POST,
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
            HttpMethod.PUT,
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
            HttpMethod.PATCH,
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
            HttpMethod.DELETE,
            path,
            inp,
            out,
            effect,
            HttpRequestOptions.from_kwargs(**kwargs),
        )
