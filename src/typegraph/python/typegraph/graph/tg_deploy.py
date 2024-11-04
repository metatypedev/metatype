# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
from dataclasses import dataclass
from typing import Any, Dict, Optional, Union
from urllib import request
from platform import python_version

from typegraph.gen.exports.utils import QueryDeployParams
from typegraph.gen.types import Err
from typegraph.gen.exports.core import MigrationAction, PrismaMigrationConfig
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_artifact_upload import ArtifactUploader
from typegraph.graph.typegraph import TypegraphOutput
from typegraph.wit import ErrorStack, SerializeParams, store, wit_utils
from typegraph import version as sdk_version
from typegraph.io import Log


@dataclass
class TypegateConnectionOptions:
    url: str
    auth: Optional[BasicAuth]


@dataclass
class TypegraphDeployParams:
    typegate: TypegateConnectionOptions
    typegraph_path: str
    prefix: Optional[str] = None
    secrets: Optional[Dict[str, str]] = None
    migrations_dir: Optional[str] = None
    migration_actions: Optional[Dict[str, MigrationAction]] = None
    default_migration_action: Optional[MigrationAction] = None


@dataclass
class TypegraphRemoveParams:
    typegate: TypegateConnectionOptions


@dataclass
class DeployResult:
    serialized: str
    response: Union[Dict[str, Any], str]


@dataclass
class RemoveResult:
    typegate: Union[Dict[str, Any], str]


@dataclass
class UploadArtifactMeta:
    name: str
    artifact_hash: str
    artifact_size_in_bytes: int


def tg_deploy(tg: TypegraphOutput, params: TypegraphDeployParams) -> DeployResult:
    typegate = params.typegate

    sep = "/" if not typegate.url.endswith("/") else ""
    url = typegate.url + sep + "typegate"

    headers = {
        "Content-Type": "application/json",
        "User-Agent": f"TypegraphSdk/{sdk_version} Python/{python_version()}",
    }
    if typegate.auth is not None:
        headers["Authorization"] = typegate.auth.as_header_value()

    serialize_params = SerializeParams(
        typegraph_path=params.typegraph_path,
        prefix=params.prefix,
        artifact_resolution=True,
        codegen=False,
        prisma_migration=PrismaMigrationConfig(
            migrations_dir=params.migrations_dir or "prisma-migrations",
            migration_actions=[
                (k, v) for k, v in (params.migration_actions or {}).items()
            ],
            default_migration_action=params.default_migration_action
            or MigrationAction(apply=True, create=False, reset=False),
        ),
        pretty=False,
    )

    serialized = tg.serialize(serialize_params)
    tg_json = serialized.tgJson
    ref_artifacts = serialized.ref_artifacts

    if len(ref_artifacts) > 0:
        # upload the referred artifacts
        artifact_uploader = ArtifactUploader(
            typegate.url,
            ref_artifacts,
            tg.name,
            typegate.auth,
            headers,
            params.typegraph_path,
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
        raise ErrorStack(res.value)

    req = request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=res.value.encode(),
    )

    response = exec_request(req)
    response = response.read().decode()
    response = handle_response(response)

    if response.get("errors") is not None:
        for err in response.errors:
            Log.error(err.message)
        raise Exception(f"failed to deploy typegraph {tg.name}")

    add_typegraph = response.get("data").get("addTypegraph")

    """ 
      # FIXME: read comments in similar section of typescript
      if add_typegraph.get("failure") is not None:
        Log.error(add_typegraph.failure)
        raise Exception(f"failed to deploy typegraph {tg.name}") """

    return DeployResult(serialized=tg_json, response=add_typegraph)


def tg_remove(typegraph_name: str, params: TypegraphRemoveParams):
    typegate = params.typegate

    sep = "/" if not typegate.url.endswith("/") else ""
    url = typegate.url + sep + "typegate"

    headers = {"Content-Type": "application/json"}
    if typegate.auth is not None:
        headers["Authorization"] = typegate.auth.as_header_value()

    res = wit_utils.gql_remove_query(store, [typegraph_name])

    if isinstance(res, Err):
        raise ErrorStack(res.value)

    req = request.Request(
        url=url,
        method="POST",
        headers=headers,
        data=res.value.encode(),
    )

    response = exec_request(req).read().decode()
    response = handle_response(response, req.full_url)
    return RemoveResult(typegate=response)


# simple wrapper for a more descriptive error
def exec_request(req: Any):
    try:
        return request.urlopen(req)
    except request.HTTPError as res:
        # Note: 400 status and such, the response body
        # is hidden within the exception and can be consumed through .read()
        return res
    except Exception as e:
        raise Exception(f"{e}: {req.full_url}")


def handle_response(res: Any, url=""):
    try:
        return json.loads(res)
    except Exception as _:
        raise Exception(f'Expected json object: got "{res}": {url}')
