# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime
from typegraph.graph.params import Cors

# skip:end
import os
from typegraph.graph.metagen import Metagen


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def metagen_sdk(g: Graph):
    idv3 = t.struct(
        {
            "title": t.string(),
            "artist": t.string(),
            "releaseTime": t.datetime(),
            "mp3Url": t.uri(),
        }
    ).rename("idv3")
    deno = DenoRuntime()

    g.expose(
        Policy.public(),
        remix=deno.import_(
            idv3,
            idv3,
            module="./metagen/ts/remix.ts",
            deps=["./metagen/ts/mdk.ts"],
            name="remix_track",
        ).rename("remix_track"),
    )


if __name__ == "__main__" and False:
    metagen = Metagen(
        # the workspace root that our config is relative to
        os.path.dirname(os.path.abspath(__file__)),
        # the rest is pretty similar to the CLI config
        {
            "targets": {
                "main": [
                    {
                        "generator": "mdk_typescript",
                        "typegraph_path": __file__,
                        "path": "funcs/",
                    },
                ],
            },
        },
    )
    tg = metagen_sdk()
    # dry_run doesn't write to disk
    items = metagen.dry_run(tg, "main", None)
