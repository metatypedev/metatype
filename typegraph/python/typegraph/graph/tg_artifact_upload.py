# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Union
from urllib import request

from typegraph.gen.exports.core import Artifact
from typegraph.gen.types import Err, Ok, Result
from typegraph.graph.shared_types import BasicAuth
from typegraph.graph.tg_deploy import handle_response


@dataclass
class UploadArtifactMeta:
    typegraph_name: str
    hash: str
    size_in_bytes: int
    relative_path: str


class ArtifactUploader:
    base_url: str
    artifacts: List[Artifact]
    get_upload_url: str
    tg_name: str
    auth: Union[BasicAuth, None]
    headers: Dict[str, str]

    def __init__(
        self,
        base_url: str,
        artifacts: List[Artifact],
        tg_name: str,
        auth: Union[BasicAuth, None],
        headers: Dict[str, str],
        tg_path: str,
    ) -> None:
        self.artifacts = artifacts
        self.tg_name = tg_name
        sep = "/" if not base_url.endswith("/") else ""
        self.get_upload_url = base_url + sep + tg_name + "/artifacts/upload-urls"
        self.auth = auth
        self.headers = headers
        self.tg_path = tg_path

    def __fetch_upload_urls(
        self,
        artifact_metas: List[UploadArtifactMeta],
    ) -> List[str]:
        artifacts_json = json.dumps(artifact_metas.__dict__).encode()
        req = request.Request(
            url=self.get_upload_url,
            method="PUT",
            headers=self.headers,
            data=artifacts_json,
        )

        response = handle_response(request.urlopen(req).read().decode())
        return response

    def __upload(
        self,
        url: str,
        meta: UploadArtifactMeta,
    ) -> Result[Any, Err]:
        upload_headers = {"Content-Type": "application/octet-stream"}

        if self.auth is not None:
            upload_headers["Authorization"] = self.auth.as_header_value()

        if url is None:
            print(f"Skipping upload for artifact: {meta.relative_path}")
            return Ok(None)

        path = os.path.join(os.path.dirname(self.tg_path), meta.relative_path)
        # TODO: read in chunks?
        with open(path, "r") as file:
            content = file.read()

        upload_req = request.Request(
            url=url,
            method="POST",
            data=content.encode(),
            headers=upload_headers,
        )
        response = request.urlopen(upload_req)
        if response.status != 200:
            raise Exception(f"Failed to upload artifact {path} {response.status}")

        return handle_response(response.read().decode())

    def get_metas(self, artifacts: List[Artifact]) -> List[UploadArtifactMeta]:
        return [
            UploadArtifactMeta(
                self.tg_name, artifact.hash, artifact.size, artifact.path
            )
            for artifact in artifacts
        ]

    def __handle_errors(
        self,
        results: List[Result[Any, Err[Any]]],
        artifact_metas: List[UploadArtifactMeta],
    ):
        errors = 0
        for result, meta in zip(results, artifact_metas):
            if isinstance(result, Err):
                print(f"Failed to upload artifact {meta.relative_path}: {result.value}")
                errors += 1
            else:
                print(f"Successfuly uploaded artifact {meta.relative_path}")

        if errors > 0:
            raise Exception(f"Failed to upload {errors} artifacts")

    def upload_artifacts(
        self,
    ) -> Result[None, Err]:
        artifact_metas = self.get_metas(self.artifacts)

        upload_urls = self.__fetch_upload_urls(artifact_metas)

        results = []
        for i in range(len(artifact_metas)):
            url, meta = upload_urls[i], artifact_metas[i]
            result = self.__upload(url, meta)
            results.append(result)

        self.__handle_errors(results, artifact_metas)

        return Ok(None)
