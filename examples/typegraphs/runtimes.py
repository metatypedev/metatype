# skip:start
from typegraph import typegraph, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes import HttpRuntime


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def runtimes(g: Graph):
    # skip:end
    http = HttpRuntime("https://random.org/api")

    # same func as above
    http.get(
        "/flip_coin", t.struct({}), t.enum(["head", "tail"])
    )  # implicitly attaches runtime to all types
