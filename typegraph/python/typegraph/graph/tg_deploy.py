# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import os
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
    # TODO: fetch all the upload urls in one request
    get_upload_url = params.base_url + sep + tg.name + "/get-upload-url"
    for artifact_hash, artifact_path in ref_artifacts:
        with open(artifact_path, "rb") as artifact:
            artifact_content = artifact.read()
            artifact = UploadArtifactMeta(
                name=os.path.basename(artifact_path),
                artifact_hash=artifact_hash,
                artifact_size_in_bytes=len(artifact_content),
            )

            artifact_json = json.dumps(artifact.__dict__).encode()
            req = request.Request(
                url=get_upload_url, method="PUT", headers=headers, data=artifact_json
            )

            response = handle_response(exec_request(req).read().decode())
            artifact_upload_url = response["uploadUrl"]

            upload_headers = {"Content-Type": "application/octet-stream"}
            if params.auth is not None:
                upload_headers["Authorization"] = params.auth.as_header_value()
            upload_req = request.Request(
                url=artifact_upload_url,
                method="PUT",
                data=artifact_content,
                headers=upload_headers,
            )
            response = request.urlopen(upload_req)
            if response.status != 200:
                raise Exception(
                    f"Failed to upload artifact {artifact_path} to typegate: {response.read()}"
                )

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
        typegate=handle_response(exec_request(req).read().decode()),
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

    return RemoveResult(typegate=handle_response(exec_request(req).read().decode()))


# simple wrapper for a more descriptive error
def exec_request(req: any):
    try:
        return request.urlopen(req)
    except request.HTTPError as res:
        # Note: 400 status and such, the response body
        # is hidden within the exception and can be consumed through .read()
        return res
    except Exception as e:
        raise Exception(f"{e}: {req.full_url}")


def handle_response(res: any):
    try:
        return json.loads(res)
    except Exception as _:
        return res
