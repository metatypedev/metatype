from typegraph import TypeGraph, policies, t
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(
    "retrend",
) as g:
    public = policies.public()

    s3 = S3Runtime(
        "S3_HOST",
        "S3_REGION",
        "S3_ACCESS_KEY",
        "S3_SECRET_KEY",
        path_style_secret="S3_PATH_STYLE",
    )

    g.expose(
        listObjects=s3.list("bucket"),
        getDownloadUrl=s3.presign_get("bucket"),
        signUploadUrl=s3.presign_put("bucket"),
        upload=s3.upload("bucket", t.file().allow(["image/png", "image/jpeg"])),
        uploadMany=s3.upload_all("bucket"),
        default_policy=[public],
    )
