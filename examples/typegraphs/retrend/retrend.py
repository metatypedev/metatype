from typegraph import policies
from typegraph import t
from typegraph import TypeGraph
from typegraph.providers.aws.runtimes.s3 import S3Runtime
from typegraph.runtimes.deno import ModuleMat
from typegraph.runtimes.deno import PureFunMat


with TypeGraph(
    "retrend",
) as g:
    all = policies.public()
    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    f = ModuleMat("image_proxy_resize.ts", secrets=("IMGPROXY_SALT", "IMGPROXY_SECRET"))

    g.expose(
        presigned=s3.sign("bucket", "image/png").add_policy(all),
        list=s3.list("bucket").add_policy(all),
        resize=t.func(
            t.struct(
                {
                    "width": t.integer(),
                    "height": t.integer(),
                    "path": t.string(),
                }
            ),
            t.string(),
            f.imp("default"),
        ).add_policy(all),
        getImage=t.func(
            t.struct(),
            t.struct({"path": t.string().named("Path")}),
            PureFunMat('() => ({"path": "test.jpg"})'),
        )
        .compose(
            {
                "image": t.func(
                    t.struct(
                        {
                            "width": t.integer(),
                            "height": t.integer(),
                            "path": t.string().from_parent(g("Path")),
                        }
                    ),
                    t.string(),
                    f.imp("default"),
                )
            }
        )
        .add_policy(all),
    )
