# Copyright Metatype OÜ, licensed under the Mozilla Public License Version 2.0.
# SPDX-License-Identifier: MPL-2.0

from typegraph import Graph, Policy, t, typegraph

# skip-next-line
from typegraph.graph.params import Cors
from typegraph.providers.aws import S3Runtime


@typegraph(
    name="files-upload",
    # skip-next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def files_upload(g: Graph):
    s3 = S3Runtime(
        # we provide the name of the env vars
        # the typegate will read from
        "S3_HOST",
        "S3_REGION",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        path_style_secret="S3_PATH_STYLE",
    )

    g.expose(
        Policy.public(),
        # we can then generate helpers for interacting with our runtime
        listObjects=s3.list("examples"),
        getDownloadUrl=s3.presign_get("examples"),
        signUploadUrl=s3.presign_put("examples"),
        upload=s3.upload("examples", t.file(allow=["image/png", "image/jpeg"])),
        uploadMany=s3.upload_all("examples"),
    )
