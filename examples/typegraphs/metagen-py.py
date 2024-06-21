# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.python import PythonRuntime
from typegraph.graph.params import Cors
# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def metagen_py(g: Graph):
    idv3 = t.struct(
        {
            "title": t.string(),
            "artist": t.string(),
            "releaseTime": t.datetime(),
            "mp3Url": t.uri(),
        }
    ).rename("idv3")

    python = PythonRuntime()

    g.expose(
        Policy.public(),
        remix=python.import_(
            idv3,
            idv3,
            module="./metagen/py/remix.py",
            deps=["./metagen/py/remix_types.py"],
            name="remix_track",
        ).rename("remix_track"),
    )
