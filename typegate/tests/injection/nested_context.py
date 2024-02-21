from typegraph import typegraph, Policy, t, Graph
from typegraph.runtimes import DenoRuntime


@typegraph()
def test_nested_context(g: Graph):
    deno = DenoRuntime()
    has_profile = Policy.context("profile")

    g.expose(
        has_profile,
        injectedId=deno.identity(
            # TODO validate the path against the profiler result??
            t.struct({"id": t.integer().from_context("profile.id")})
        ),
        secondProfileData=deno.identity(
            t.struct({"second": t.integer().from_context("profile.data[1]")})
        ),
        customKey=deno.identity(
            t.struct({"custom": t.integer().from_context('profile["custom key"]')})
        ),
    )
