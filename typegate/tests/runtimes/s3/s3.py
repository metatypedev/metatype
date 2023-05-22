from typegraph import TypeGraph, policies, t
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(name="s3-test") as g:
    public = policies.public()

    s3 = S3Runtime(
        "http://localhost:9000", "local", "access_key", "secret_key", path_style=True
    )

    g.expose(
        signTextUploadUrl=s3.presign_put("bucket", "text/plain"),
        listObjects=s3.list("bucket"),
        upload=s3.upload("bucket", t.file().allow(["text/plain"])),
        getDownloadUrl=s3.presign_get("bucket"),
        default_policy=[public],
    )
