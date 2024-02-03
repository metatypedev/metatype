# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Dict, Optional
from urllib import request
import json
from base64 import b64encode
from typegraph.gen.types import Err

from typegraph.graph.typegraph import TypegraphOutput
from typegraph.gen.exports.utils import QueryBodyParams
from typegraph.wit import store, wit_utils


@dataclass
class BasicAuth:
    username: str
    password: str


@dataclass
class TypegraphDeployParams:
    base_url: str
    cli_version: str
    auth: Optional[BasicAuth] = None
    secrets: Optional[Dict[str, any]] = None


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams):
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        payload = b64encode(
            f"{params.auth.username}:{params.auth.password}".encode("utf-8")
        ).decode("utf-8")
        headers["Authorization"] = f"Basic {payload}"

    res = wit_utils.gen_gqlquery(
        store,
        params=QueryBodyParams(
            tg=tg.serialized,
            cli_version=params.cli_version,
            secrets=[(k, v) for k, v in (params.secrets or {})],
        ),
    )

    if isinstance(res, Err):
        raise Exception(res.value)

    req = request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=res.value.encode(),
    )

    body = request.urlopen(req).read().decode()
    try:
        return json.loads(body)
    except Exception as _:
        return body
