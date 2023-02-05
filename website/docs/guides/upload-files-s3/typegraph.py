from typegraph import policies
from typegraph import TypeGraph
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(
    "retrend",
) as g:

    public = policies.public()
    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    g.expose(
        presigned=s3.sign("bucket", "image/png").add_policy(public),
    )
