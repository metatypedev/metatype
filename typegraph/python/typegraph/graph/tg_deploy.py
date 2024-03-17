# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import os
import sys
from dataclasses import dataclass
from typing import Dict, Optional, Union
from urllib import request

from typegraph.gen.exports.utils import QueryDeployParams
from typegraph.gen.types import Err
from typegraph.graph.shared_types import BasicAuth
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
    file_hash: str
    file_size_in_bytes: int


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

    result = DeployResult(
        serialized=serialized,
        typegate=handle_response(request.urlopen(req).read().decode()),
    )

    # upload the referred files
    # print("***************A")
    ref_files = {
        "662307922d7b879a17ce206d57db63b27630a7b4a8de2455a5730fb4bfe07a5c": "file:rust.wasm"
    }
    # if isinstance(ref_files, Err):
    #     raise Exception(ref_files.value)

    # TODO: fetch all the upload by one request
    get_upload_url = params.base_url + sep + tg.name + "/get-upload-url"
    for file_hash, file_path in ref_files.items():
        prefix = "file:"
        if not file_path.startswith(prefix):
            raise Exception(f"file path {file_path} should start with {prefix}")

        curr_dir = os.path.dirname(os.path.abspath(sys.argv[0]))
        file_path = os.path.join(curr_dir, file_path[len(prefix) :])

        with open(file_path, "rb") as file:
            file_content = file.read()
            artifact = UploadArtifactMeta(
                name=os.path.basename(file_path),
                file_hash=file_hash,
                file_size_in_bytes=len(file_content),
            )

            artifact_json = json.dumps(artifact.__dict__).encode()
            req = request.Request(
                url=get_upload_url, method="PUT", headers=headers, data=artifact_json
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

    return result


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
