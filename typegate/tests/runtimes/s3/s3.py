from typegraph import TypeGraph, policies, t
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(name="s3_test") as g:
    public = policies.public()

    s3 = S3Runtime(
        "http://localhost:9000", "local", "access_key", "secret_key", path_style=True
    )

    g.expose(
        listObjects=s3.list("bucket"),
        getDownloadUrl=s3.presign_get("bucket"),
        signTextUploadUrl=s3.presign_put("bucket", "text/plain"),
        upload=s3.upload("bucket", t.file().allow(["text/plain"])),
        uploadMany=s3.upload_all("bucket"),
        default_policy=[public],
    )
