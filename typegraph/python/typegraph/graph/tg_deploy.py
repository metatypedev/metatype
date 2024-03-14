# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from base64 import b64encode
from dataclasses import dataclass
from typing import Dict, Optional, Union
from urllib import request
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


@dataclass
class UploadArtifactMeta:
    name: str
    file_hash: str
    file_size_in_bytes: int


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams) -> DeployResult:
    sep = "/" if not params.base_url.endswith("/") else ""
    url = params.base_url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if params.auth is not None:
        headers["Authorization"] = params.auth.as_header_value()
    serialized = tg.serialize(params.artifacts_config)

    # upload the referred files
    ref_files = core.get_ref_files(store)
    if isinstance(ref_files, Err):
        raise Exception(ref_files.value)

    # TODO: fetch all the upload by one request
    get_upload_url = params.base_url + sep + "get-upload-url"
    for file_hash, file_path in ref_files.value:
        with open(file_path, "rb") as file:
            file_content = file.read()
            artifact = UploadArtifactMeta(
                name=file.name,
                file_hash=file_hash,
                file_size_in_bytes=len(file_content),
            )
            req = request.Request(
                url=get_upload_url, method="GET", headers=headers, data=artifact
            )

            response = handle_response(request.urlopen(req).read().decode())
            file_upload_url = response["uploadUrl"]
            upload_req = request.Request(
                url=file_upload_url,
                method="PUT",
                data=file_content,
                headers={"Content-Type": "application/octet-stream"},
            )
            response = request.urlopen(upload_req)

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
