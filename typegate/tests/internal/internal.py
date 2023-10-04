from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes.deno import DenoRuntime


@typegraph(name="test_internal")
def test_internal(g: Graph):
    public = Policy.public()
    internal = Policy.internal()

    deno = DenoRuntime()

    inp = t.struct({"first": t.float(), "second": t.float()})
    out = t.float()

    g.expose(
        sum=deno.import_(inp, out, module="ts/logic.ts", name="sum").with_policy(
            internal
        ),
        remoteSum=deno.import_(
            inp, out, module="ts/logic.ts", name="remoteSum"
        ).with_policy(public),
    )
