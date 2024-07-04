# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
from urllib import request, parse as Url
from urllib.error import HTTPError

from typegraph.gen.exports.core import Artifact
from typegraph.gen.types import Err, Ok, Result
from typegraph.graph.shared_types import BasicAuth
from typegraph.io import Log


@dataclass
class UploadArtifactMeta:
    typegraphName: str
    hash: str
    sizeInBytes: int
    relativePath: str


class ArtifactUploader:
    base_url: str
    artifacts: List[Artifact]
    tg_name: str
    auth: Union[BasicAuth, None]
    headers: Dict[str, str]
    tg_path: Optional[str]

    def __init__(
        self,
        base_url: str,
        artifacts: List[Artifact],
        tg_name: str,
        auth: Union[BasicAuth, None],
        headers: Dict[str, str],
        tg_path: str,
    ) -> None:
        self.base_url = base_url
        self.artifacts = artifacts
        self.tg_name = tg_name
        self.auth = auth
        self.headers = headers
        self.tg_path = tg_path

    def __get_upload_tokens(
        self,
        artifact_metas: List[UploadArtifactMeta],
    ) -> List[str]:
        artifacts_objs = [vars(meta) for meta in artifact_metas]
        artifacts_json = json.dumps(artifacts_objs, indent=4).encode()

        sep = "/" if not self.base_url.endswith("/") else ""
        url = self.base_url + sep + self.tg_name + "/artifacts/prepare-upload"
        req = request.Request(
            url=url,
            method="POST",
            headers=self.headers,
            data=artifacts_json,
        )

        try:
            response = request.urlopen(req)
        except HTTPError as e:
            Log.error("error message:", e.fp.read().decode())
            raise Exception(f"failed to get upload URLs: {e}")

        if response.status != 200:
            raise Exception(f"failed to get upload URLs: {response}")

        response = handle_response(response.read().decode())
        return response

    def __upload(
        self,
        token: str,
        meta: UploadArtifactMeta,
    ) -> Result[Any, Err]:
        upload_headers = {"Content-Type": "application/octet-stream"}

        if self.auth is not None:
            upload_headers["Authorization"] = self.auth.as_header_value()
        Log.debug("upload headers", upload_headers)

        if token is None:
            Log.info("skipping artifact upload:", meta.relativePath)
            return Ok(None)

        if self.tg_path is None:
            raise Exception("Typegraph path not set in Deploy Params")

        path = os.path.join(os.path.dirname(self.tg_path), meta.relativePath)
        # TODO: read in chunks?
        with open(path, "rb") as file:
            content = file.read()

        base_url = Url.urlparse(self.base_url)
        sep = "/" if not base_url.path.endswith("/") else ""
        upload_url = base_url._replace(
            path=base_url.path + sep + self.tg_name + "/artifacts",
            query=Url.urlencode({"token": token}),
        )
        upload_url = Url.urlunparse(upload_url)

        Log.debug("uploading artifact", meta.relativePath, upload_url)
        upload_req = request.Request(
            url=upload_url,
            method="POST",
            data=content,
            headers=upload_headers,
        )
        try:
            response = request.urlopen(upload_req)
        except HTTPError as e:
            Log.error("failed to upload artifact", meta.relativePath, e)
            errmsg = json.load(e.fp).get("error", None)
            Log.error("error message:", errmsg)
            raise Exception(errmsg)
        if response.status != 201:
            raise Exception(f"failed to upload artifact {path} {response.status}")

        Log.info("✓ artifact uploaded", meta.relativePath)

        # TODO why??
        return handle_response(response.read().decode())

    def get_metas(self, artifacts: List[Artifact]) -> List[UploadArtifactMeta]:
        return [
            UploadArtifactMeta(
                typegraphName=self.tg_name,
                hash=artifact.hash,
                sizeInBytes=artifact.size,
                relativePath=artifact.path,
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
                print(
                    f"failed to upload artifact {meta.relativePath}: {result.value}",
                    file=sys.stderr,
                )
                errors += 1
            # else:
            #     print(f"Successfuly uploaded artifact {meta.relativePath}", file=sys.stderr)

        if errors > 0:
            raise Exception(f"failed to upload {errors} artifacts")

    def upload_artifacts(
        self,
    ) -> Result[None, Err]:
        artifact_metas = self.get_metas(self.artifacts)

        upload_urls = self.__get_upload_tokens(artifact_metas)
        Log.debug("upload urls", upload_urls)

        results = []
        for i in range(len(artifact_metas)):
            url, meta = upload_urls[i], artifact_metas[i]
            result = self.__upload(url, meta)
            results.append(result)

        self.__handle_errors(results, artifact_metas)

        return Ok(None)


def handle_response(res: Any):
    try:
        return json.loads(res)
    except Exception as _:
        return res
