from typegraph import TypeGraph, policies
from typegraph.providers.aws.runtimes.s3 import S3Runtime

with TypeGraph(
    "retrend",
) as g:
    public = policies.public()
    s3 = S3Runtime("S3_HOST", "S3_REGION", "access_key", "secret_key")

    g.expose(
        presigned=s3.presign_put("bucket", "image/png").add_policy(public),
    )
