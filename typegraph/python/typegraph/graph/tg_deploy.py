# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from dataclasses import dataclass
from typing import Dict, Optional, Union
from urllib import request

from typegraph.gen.exports.utils import QueryDeployParams
from typegraph.gen.types import Err
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_artifact_upload import ArtifactUploader
from typegraph.graph.typegraph import TypegraphOutput
from typegraph.wit import ArtifactResolutionConfig, store, wit_utils


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


@dataclass
class UploadArtifactMeta:
    name: str
    artifact_hash: str
    artifact_size_in_bytes: int


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams) -> DeployResult:
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        headers["Authorization"] = params.auth.as_header_value()
    serialized = tg.serialize(params.artifacts_config)
    tg_json = serialized.tgJson
    ref_artifacts = serialized.ref_artifacts

    # upload the referred artifacts
    artifact_uploader = ArtifactUploader(
        params.base_url,
        ref_artifacts,
        tg.name,
        params.auth,
        headers,
    )
    artifact_uploader.upload_artifacts()

    # deploy the typegraph
    res = wit_utils.gql_deploy_query(
        store,
        params=QueryDeployParams(
            tg=tg_json,
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
        serialized=tg_json,
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
