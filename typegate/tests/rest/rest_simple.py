from typegraph import Graph, Policy, t, typegraph
from typegraph.runtimes.deno import DenoRuntime


@typegraph(dynamic=False)
def custom(g: Graph):
    deno = DenoRuntime()
    pub = Policy.public()

    g.rest(
        """
        query ping {
            ping
        }
        """
    )

    ping = deno.func(
        t.struct({}),
        t.integer(),
        code="() => 1",
    ).with_policy(pub)

    g.expose(
        ping=ping,
    )
