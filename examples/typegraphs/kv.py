# skip:start
from typegraph import Graph, Policy, typegraph
from typegraph.runtimes.kv import KvRuntime

# skip:end


@typegraph()
def kv(g: Graph):
    kv = KvRuntime("REDIS")

    g.expose(
        Policy.public(),
        get=kv.get(),
        set=kv.set(),
        delete=kv.delete(),
        keys=kv.keys(),
        values=kv.values(),
    )
