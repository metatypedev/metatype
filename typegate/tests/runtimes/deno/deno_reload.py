import os

from typegraph_next import typegraph, Policy, t, Graph
from typegraph_next.runtimes.deno import DenoRuntime


@typegraph()
def deno_reload(g: Graph):
    deno = DenoRuntime()
    public = Policy.public()

    g.expose(
        fire=deno.import_(
            t.struct({}),
            t.float(),
            module=os.environ["DYNAMIC"],
            name="fire",
        ).with_policy(public),
    )
