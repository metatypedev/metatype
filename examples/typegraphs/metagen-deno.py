# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes.deno import DenoRuntime
# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def metagen_deno(g: Graph):
    idv3 = t.struct(
        {
            "title": t.string(),
            "artist": t.string(),
            "releaseTime": t.datetime(),
            "mp3Url": t.uri(),
            # explicit type names help when generating code
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
        ).rename("remix_track"),  # explicit names help
    )
