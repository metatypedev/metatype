# skip:start
from typegraph import typegraph, t, Graph
from typegraph.runtimes import HttpRuntime


@typegraph()
def runtimes(g: Graph):
    # skip:end
    http = HttpRuntime("https://random.org/api")

    # same func as above
    http.get(
        "/flip_coin", t.struct({}), t.enum(["head", "tail"])
    )  # implicitly attaches runtime to all types
