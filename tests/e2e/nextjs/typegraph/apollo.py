from typegraph import Graph, Policy, t, typegraph
from typegraph.graph.params import Cors
from typegraph.providers.aws import S3Runtime


@typegraph(cors=Cors(allow_origin="*"))
def apollo(g: Graph):
    public = Policy.public()

    s3 = S3Runtime(
        "HOST", "REGION", "access_key", "secret_key", path_style_secret="PATH_STYLE"
    )

    g.expose(
        public,
        listObjects=s3.list("bucket"),
        upload=s3.upload("bucket", t.file(allow=["text/plain"])),
        uploadMany=s3.upload_all("bucket"),
    )
