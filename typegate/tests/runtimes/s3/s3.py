from typegraph import typegraph, Policy, t, Graph
from typegraph.providers.aws import S3Runtime


@typegraph()
def s3_test(g: Graph):
    public = Policy.public()

    s3 = S3Runtime(
        "HOST", "REGION", "access_key", "secret_key", path_style_secret="PATH_STYLE"
    )

    g.expose(
        public,
        listObjects=s3.list("bucket"),
        getDownloadUrl=s3.presign_get("bucket"),
        signTextUploadUrl=s3.presign_put("bucket", "text/plain"),
        upload=s3.upload("bucket", t.file(allow=["text/plain"])),
        uploadMany=s3.upload_all("bucket"),
    )
