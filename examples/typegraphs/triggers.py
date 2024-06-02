# skip:start
from typegraph import typegraph, Policy, t, Graph
from typegraph.graph.params import Cors
from typegraph.runtimes.http import HttpRuntime


# skip:end
@typegraph(
    # skip:next-line
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def triggers(g: Graph):
    # skip:start
    public = Policy.public()
    http = HttpRuntime("https://random.org/api")
    # skip:end
    # ...
    g.expose(
        public,
        flip=http.get("/flip_coin", t.struct({}), t.enum(["head", "tail"])),
    )
