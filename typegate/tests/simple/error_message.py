from typegraph import typegraph, effects, Policy, t, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def test_error(g: Graph):
    deno = DenoRuntime()
    user = t.struct({"id": t.integer(), "name": t.string()})
    g.expose(
        returnSelf=deno.identity(user.rename("A")).with_policy(Policy.public()),
        returnSelfQuery=deno.identity(user.rename("B")).with_policy(Policy.public()),
        returnSelfMutation=deno.func(
            user.rename("InputC"),
            user.rename("OutputC"),
            code="(x) => x",
            effect=effects.create(),
        ).with_policy(Policy.public()),
    )
