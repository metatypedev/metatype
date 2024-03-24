# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple
from urllib import request

from typegraph.gen.types import Err, Result
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import handle_response
from typegraph.wit import runtimes, store


@dataclass
class UploadArtifactMeta:
    name: str
    artifact_hash: str
    artifact_size_in_bytes: int
    path_suffix: List[str]


class ArtifactUploader:
    base_url: str
    ref_artifacts: List[Tuple[str, str]]
    get_upload_url: str
    tg_name: str
    auth: BasicAuth
    headers: Dict[str, str]

    def __init__(
        self,
        base_url: str,
        artifacts: List[Tuple[str, str]],
        tg_name: str,
        auth: BasicAuth,
        headers: Dict[str, str],
    ) -> None:
        self.base_url = base_url
        self.ref_artifacts = artifacts
        self.tg_name = tg_name
        sep = "/" if not base_url.endswith("/") else ""
        self.get_upload_url = base_url + sep + tg_name + "/get-upload-url"
        self.auth = auth
        self.headers = headers

    # TODO: fetch all the upload urls in one request
    def __fetch_upload_url(
        self,
        artifact_path: str,
        artifact_hash: str,
        artifact_content: bytes,
        path_suffix: List[str],
    ) -> str:
        artifact = UploadArtifactMeta(
            name=os.path.basename(artifact_path),
            artifact_hash=artifact_hash,
            artifact_size_in_bytes=len(artifact_content),
            path_suffix=path_suffix,
        )

        artifact_json = json.dumps(artifact.__dict__).encode()
        req = request.Request(
            url=self.get_upload_url,
            method="PUT",
            headers=self.headers,
            data=artifact_json,
        )

        response = handle_response(request.urlopen(req).read().decode())
        return response["uploadUrl"]

    def __upload(
        self,
        url: str,
        content: bytes,
        artifact_path: str,
    ) -> Result[str, Err]:
        upload_headers = {"Content-Type": "application/octet-stream"}
        if self.auth is not None:
            upload_headers["Authorization"] = self.auth.as_header_value()
        upload_req = request.Request(
            url=url,
            method="PUT",
            data=content,
            headers=upload_headers,
        )
        response = request.urlopen(upload_req)
        if response.status != 200:
            raise Exception(
                f"Failed to upload artifact {artifact_path} to typegate: {response.read()}"
            )

        return response

    def upload_artifacts(
        self,
    ) -> Result[None, Err]:
        for artifact_hash, artifact_path in self.ref_artifacts:
            self.__upload_artifact(artifact_hash, artifact_path)

    def __upload_artifact(self, artifact_hash: str, artifact_path: str):
        with open(artifact_path, "rb") as artifact:
            artifact_content = artifact.read()
            artifact_upload_url = self.__fetch_upload_url(
                artifact_path, artifact_hash, artifact_content, [artifact_hash]
            )

            _upload_result = self.__upload(
                artifact_upload_url, artifact_content, artifact_path
            )

            self.__upload_artifact_dependencies(artifact_hash)

    def __upload_artifact_dependencies(self, artifact_hash: str) -> Result[None, Err]:
        dep_metas = runtimes.get_deps(store, artifact_hash)
        if isinstance(dep_metas, Err):
            raise Exception(dep_metas.value)

        dep_metas = dep_metas.value

        for dep_meta in dep_metas:
            dep_hash = dep_meta.dep_hash
            dep_path = dep_meta.path
            relative_prefix = dep_meta.relative_path_prefix

            with open(dep_path, "rb") as dep:
                dep_content = dep.read()
                dep_upload_url = self.__fetch_upload_url(
                    dep_path, dep_hash, dep_content, [artifact_hash, relative_prefix]
                )

                _upload_result = self.__upload(dep_upload_url, dep_content, dep_path)


"""

    what would uploading artifact with deps look like:
        - get an upload url for the artifact, and use the artifact_hash as a suffix to store the artifact and the deps. The suffix is to be appended to the path where the artifact and the deps are gonna be stored
        - get all the deps of the artifact
        - upload them in parallel 
        
    
    - serialize(done, not tested) => upload(ts sdk left, not tested) => resolve(done, not tested)
    
    - testing left

"""
