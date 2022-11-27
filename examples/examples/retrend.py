from typegraph.graphs.typegraph import TypeGraph
from typegraph.materializers.deno import FunMat
from typegraph.materializers.deno import ModuleMat
from typegraph.materializers.s3 import S3Runtime
from typegraph.policies import allow_all
from typegraph.types import types as t


with TypeGraph(
    "retrend",
) as g:

    all = allow_all()
    s3 = S3Runtime("http://localhost:9000", "local", "access_key", "secret_key")

    f = ModuleMat("image_proxy_resize.ts", secrets=("IMGPROXY_SALT", "IMGPROXY_SECRET"))

    g.expose(
        presigned=s3.sign("images", "image/png").add_policy(all),
        list=s3.list("images").add_policy(all),
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
            FunMat('() => ({"path": "test.jpg"})'),
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
