# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from dataclasses import dataclass
from typing import Dict, Optional, Union
from urllib import request
import json
from typegraph.graph.shared_types import BasicAuth
from typegraph.wit import ArtifactResolutionConfig
from typegraph.gen.types import Err

from typegraph.graph.typegraph import TypegraphOutput
from typegraph.gen.exports.utils import QueryDeployParams
from typegraph.wit import store, wit_utils


@dataclass
class TypegraphDeployParams:
    base_url: str
    artifacts_config: ArtifactResolutionConfig
    auth: Optional[BasicAuth] = None
    secrets: Optional[Dict[str, str]] = None


@dataclass
class TypegraphRemoveParams:
    base_url: str
    auth: Optional[BasicAuth] = None


@dataclass
class DeployResult:
    serialized: str
    typegate: Union[Dict[str, any], str]


@dataclass
class RemoveResult:
    typegate: Union[Dict[str, any], str]


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams) -> DeployResult:
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        headers["Authorization"] = params.auth.as_header_value()
    serialized = tg.serialize(params.artifacts_config)
    res = wit_utils.gql_deploy_query(
        store,
        params=QueryDeployParams(
            tg=serialized,
            secrets=[(k, v) for k, v in (params.secrets or {}).items()],
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
    return DeployResult(
        serialized=serialized,
        typegate=handle_response(request.urlopen(req).read().decode()),
    )


def tg_remove(tg: TypegraphOutput, params: TypegraphRemoveParams):
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        headers["Authorization"] = params.auth.as_header_value()

    res = wit_utils.gql_remove_query(store, [tg.name])

    if isinstance(res, Err):
        raise Exception(res.value)

    req = request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=res.value.encode(),
    )
    return RemoveResult(typegate=handle_response(request.urlopen(req).read().decode()))


def handle_response(res: any):
    try:
        return json.loads(res)
    except Exception as _:
        return res
