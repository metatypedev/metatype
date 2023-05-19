from typegraph import TypeGraph, policies, t
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(name="s3-test") as g:
    public = policies.public()

    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    g.expose(
        upload=s3.upload("bucket", t.file().allow(["text/plain"])).add_policy(public),
        getDownloadUrl=s3.download_url("bucket").add_policy(public),
    )
