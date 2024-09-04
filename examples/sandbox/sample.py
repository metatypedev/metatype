from typegraph import typegraph, t, Graph

# from typegraph.gen.exports.runtimes import RedisBackend
from typegraph.graph.params import Cors
from typegraph.policy import Policy
from typegraph.runtimes.deno import DenoRuntime
from typegraph.runtimes.substantial import Backend


@typegraph(
    cors=Cors(allow_origin=["https://metatype.dev", "http://localhost:3000"]),
)
def runtimes(g: Graph):
    # NOTE: WILL RM THIS LATER

    deno = DenoRuntime()
    pub = Policy.public()
    # backend = Backend.redis(RedisBackend(host="some host", port=1234))
    backend = Backend.memory()

    wf = deno.workflow(
        backend,
        file="workflow.ts",
        name="example",
    )

    g.expose(
        pub,
        start=wf.start(t.struct({"a": t.integer(), "b": t.integer()})),
        stop=wf.stop(),
        ressources=wf.query_ressources(),
        results=wf.query_results(t.integer()),
    )
