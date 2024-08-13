# skip:start
from typegraph import Graph, Policy, typegraph
from typegraph.graph.params import Cors
from typegraph.runtimes.kv import KvRuntime

# skip:end


@typegraph(
    # skip:start
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
    # skip:end
)
def key_value(g: Graph):
    kv = KvRuntime("REDIS")

    g.expose(
        Policy.public(),
        get=kv.get(),
        set=kv.set(),
        delete=kv.delete(),
        keys=kv.keys(),
        values=kv.values(),
    )
