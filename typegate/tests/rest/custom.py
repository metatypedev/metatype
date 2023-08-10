from typegraph_next import t, typegraph, Graph, Policy
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph(dynamic=False, folder="custom_dir")
def custom(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    ping = deno.func(
        t.struct({}),
        t.integer(),
        code="() => 1",
    ).with_policy(pub)

    g.expose(
        ping=ping,
    )
