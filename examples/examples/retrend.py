from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.s3 import S3Runtime
from typegraph.policies import allow_all

with TypeGraph(
    "retrend",
) as g:

    all = allow_all()
    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    g.expose(
        presigned=s3.sign("images", "image/png").add_policy(all),
        list=s3.list("images").add_policy(all),
    )
