from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.aws import S3Runtime

# skip-next-line
from typegraph.graph.params import Cors


@typegraph(
    name="file-upload",
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
        listObjects=s3.list("bucket"),
        getDownloadUrl=s3.presign_get("bucket"),
        signUploadUrl=s3.presign_put("bucket"),
        upload=s3.upload("bucket", t.file(allow=["image/png", "image/jpeg"])),
        uploadMany=s3.upload_all("bucket"),
    )
